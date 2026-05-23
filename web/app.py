"""
⚠️ LEGACY — 此文件已不再使用
══════════════════════════════════════
AI 知识图谱系统 v2 - Flask 后端已被移除。
当前项目是纯静态架构，使用 build.py 编译 vault/ 内容，
然后 python -m http.server 或任意 HTTP 服务器运行。

详见 build.py 和 docs/CONTRACT.md。
══════════════════════════════════════

以下为原始代码，仅供历史参考。
"""
import os
import re
import sys
import logging

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify, request, render_template
from vault_parser import (
    load_areas, load_directions, load_topics,
    load_topic_by_id, load_direction_by_id,
    load_learning_paths,
    parse_quiz, update_topic_status,
    get_graph_data, get_progress,
    get_global_diagnostic_questions, submit_global_diagnostic,
    get_direction_quiz, submit_direction_quiz,
    strip_quiz_answers, validate_quiz_answer,
    search_knowledge, build_cli_search_prompt
)
from recommender import get_recommendations

# ── 应用配置 ─────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
logger = logging.getLogger(__name__)

DEBUG = os.environ.get('FLASK_DEBUG', '0') == '1'

app = Flask(__name__)
app.json.ensure_ascii = False
# #2: 设置 secret_key，防止 session cookie 伪造
app.secret_key = os.environ.get('FLASK_SECRET_KEY', os.urandom(24).hex())
# #8: 限制请求体大小，防止内存耗尽攻击
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1 MB


def _err(e: Exception, msg: str = 'Internal server error'):
    """统一错误响应：生产环境隐藏异常详情，仅记录日志。"""
    logger.exception("API error [%s %s]: %s", request.method, request.path, e)
    return jsonify({'error': str(e) if DEBUG else msg}), 500


# ── #3: CSRF 防护（Origin/Referer 校验） ──────────────────────

_ALLOWED_ORIGINS = ('http://localhost', 'http://127.0.0.1')

@app.before_request
def csrf_protect():
    if request.method not in ('POST', 'PUT', 'DELETE', 'PATCH'):
        return
    origin  = request.headers.get('Origin', '')
    referer = request.headers.get('Referer', '')
    if origin:
        if not any(origin.startswith(o) for o in _ALLOWED_ORIGINS):
            logger.warning("CSRF blocked: Origin=%s", origin)
            return jsonify({'error': 'Forbidden'}), 403
    elif referer:
        if not any(referer.startswith(o) for o in _ALLOWED_ORIGINS):
            logger.warning("CSRF blocked: Referer=%s", referer)
            return jsonify({'error': 'Forbidden'}), 403


# ── #7: 安全 HTTP 响应头 ──────────────────────────────────────

@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self' https://d3js.org 'unsafe-inline'"
    )
    return response


# ============================================================
# 页面路由
# ============================================================

@app.route('/')
def index():
    return render_template('index.html')


# ============================================================
# 基础数据 API
# ============================================================

@app.route('/api/areas')
def api_areas():
    try:
        areas = load_areas()
        result = [
            {
                'id': a.get('id'), 'name': a.get('name'), 'name_en': a.get('name_en'),
                'color': a.get('color'), 'icon': a.get('icon'),
                'description': a.get('description'), 'direction_count': a.get('direction_count')
            }
            for a in areas
        ]
        return jsonify(result)
    except Exception as e:
        return _err(e)


@app.route('/api/directions')
def api_directions():
    try:
        area_id = request.args.get('area_id')
        directions = load_directions()
        if area_id:
            directions = [d for d in directions if d.get('area') == area_id]
        result = [
            {
                'id': d.get('id'), 'name': d.get('name'), 'name_en': d.get('name_en'),
                'area': d.get('area'), 'color': d.get('color'),
                'description': d.get('description'), 'topic_count': d.get('topic_count')
            }
            for d in directions
        ]
        return jsonify(result)
    except Exception as e:
        return _err(e)


@app.route('/api/topics')
def api_topics():
    try:
        direction_id = request.args.get('direction_id')
        area_id      = request.args.get('area_id')
        topics = load_topics()
        if direction_id:
            topics = [t for t in topics if t.get('direction') == direction_id]
        elif area_id:
            topics = [t for t in topics if t.get('area') == area_id]
        result = [
            {
                'id': t.get('id'), 'name': t.get('name'), 'name_en': t.get('name_en'),
                'area': t.get('area'), 'direction': t.get('direction'),
                'prerequisites': t.get('prerequisites', []),
                'difficulty': t.get('difficulty', 3), 'importance': t.get('importance', 3),
                'status': t.get('status', 'unknown'), 'tags': t.get('tags', [])
            }
            for t in topics
        ]
        return jsonify(result)
    except Exception as e:
        return _err(e)


@app.route('/api/graph')
def api_graph():
    try:
        return jsonify(get_graph_data())
    except Exception as e:
        return _err(e)


@app.route('/api/progress')
def api_progress():
    try:
        return jsonify(get_progress())
    except Exception as e:
        return _err(e)


# ============================================================
# 全局诊断 API
# ============================================================

@app.route('/api/diagnostic')
def api_diagnostic():
    try:
        # #9: n_per_direction 上界限制，防止请求触发全量解析
        n = min(max(int(request.args.get('n_per_direction', 2)), 1), 3)
        questions = get_global_diagnostic_questions(n_per_direction=n)
        return jsonify({'questions': strip_quiz_answers(questions), 'total': len(questions)})
    except Exception as e:
        return _err(e)


@app.route('/api/diagnostic/submit', methods=['POST'])
def api_diagnostic_submit():
    try:
        data = request.get_json()
        answers = data.get('answers', []) if data else []
        if not answers:
            return jsonify({'error': 'answers required'}), 400
        return jsonify(submit_global_diagnostic(answers))
    except Exception as e:
        return _err(e)


# ============================================================
# 方向测评 API
# ============================================================

@app.route('/api/direction/<direction_id>/quiz')
def api_direction_quiz(direction_id):
    if not _VALID_ID.match(direction_id):
        return jsonify({'error': 'Invalid direction id'}), 400
    try:
        quiz_data = get_direction_quiz(direction_id)
        if not quiz_data:
            return jsonify({'error': f'Direction {direction_id} not found'}), 404
        quiz_data['questions'] = strip_quiz_answers(quiz_data.get('questions', []))
        return jsonify(quiz_data)
    except Exception as e:
        return _err(e)


@app.route('/api/direction/<direction_id>/quiz/submit', methods=['POST'])
def api_direction_quiz_submit(direction_id):
    if not _VALID_ID.match(direction_id):
        return jsonify({'error': 'Invalid direction id'}), 400
    try:
        data = request.get_json()
        answers = data.get('answers', []) if data else []
        if not answers:
            return jsonify({'error': 'answers required'}), 400
        return jsonify(submit_direction_quiz(direction_id, answers))
    except Exception as e:
        return _err(e)


# ============================================================
# 答案验证 API
# ============================================================

@app.route('/api/answer-check', methods=['POST'])
def api_answer_check():
    try:
        data = request.get_json()
        topic_id  = data.get('topic_id', '') if data else ''
        q_index   = data.get('within_topic_q_index', data.get('question_index', 0)) if data else 0
        selected  = data.get('selected_index', -1) if data else -1
        is_correct, correct_index, explanation = validate_quiz_answer(topic_id, q_index, selected)
        return jsonify({'is_correct': is_correct, 'correct_index': correct_index, 'explanation': explanation})
    except Exception as e:
        return _err(e)


# ============================================================
# 单题 Quiz API
# ============================================================

@app.route('/api/quiz/<topic_id>')
def api_quiz(topic_id):
    if not _VALID_ID.match(topic_id):
        return jsonify({'error': 'Invalid topic id'}), 400
    try:
        topic = load_topic_by_id(topic_id)
        if not topic:
            return jsonify({'error': f'Topic {topic_id} not found'}), 404
        body = topic.get('body', '')
        questions = parse_quiz(body, topic_id=topic_id)
        return jsonify({
            'topic_id': topic_id,
            'topic_name': topic.get('name'),
            'topic_name_en': topic.get('name_en'),
            'description': body.strip().split('\n')[0][:300] if body else '',
            'difficulty': topic.get('difficulty', 3),
            'area': topic.get('area'),
            'direction': topic.get('direction'),
            'questions': strip_quiz_answers(questions),
            'current_status': topic.get('status', 'unknown')
        })
    except Exception as e:
        return _err(e)


@app.route('/api/quiz/<topic_id>/submit', methods=['POST'])
def api_quiz_submit(topic_id):
    if not _VALID_ID.match(topic_id):
        return jsonify({'error': 'Invalid topic id'}), 400
    try:
        data = request.get_json()
        answers = data.get('answers', []) if data else []
        topic = load_topic_by_id(topic_id)
        if not topic:
            return jsonify({'error': f'Topic {topic_id} not found'}), 404
        body = topic.get('body', '')
        questions = parse_quiz(body, topic_id=topic_id)
        if not questions:
            return jsonify({'error': 'No questions found'}), 400

        correct_count = 0
        results = []
        for q, user_answer in zip(questions, answers):
            correct_idx = q.get('correct_index', -1)
            is_correct  = (user_answer == correct_idx)
            if is_correct:
                correct_count += 1
            results.append({
                'question': q.get('question'), 'user_answer': user_answer,
                'correct_index': correct_idx, 'is_correct': is_correct,
                'explanation': q.get('explanation', ''), 'options': q.get('options', [])
            })

        total = len(questions)
        new_status = 'mastered' if correct_count == total else ('learning' if correct_count >= total - 1 else 'unknown')
        update_topic_status(topic_id, new_status)

        return jsonify({
            'topic_id': topic_id, 'topic_name': topic.get('name'),
            'score': correct_count, 'total': total,
            'new_status': new_status, 'results': results
        })
    except Exception as e:
        return _err(e)


# ============================================================
# 状态更新 API
# ============================================================

_VALID_ID = re.compile(r'^[a-z][a-z0-9_]{0,63}$')

@app.route('/api/status/<topic_id>', methods=['POST'])
def api_update_status(topic_id):
    if not _VALID_ID.match(topic_id):
        return jsonify({'error': 'Invalid topic id'}), 400
    try:
        data = request.get_json()
        new_status = data.get('status') if data else None
        if not new_status:
            return jsonify({'error': 'status field is required'}), 400
        topic = load_topic_by_id(topic_id)
        if not topic:
            return jsonify({'error': f'Topic {topic_id} not found'}), 404
        success = update_topic_status(topic_id, new_status)
        if not success:
            return jsonify({'error': f'Invalid status: {new_status}'}), 400
        return jsonify({'topic_id': topic_id, 'status': new_status, 'message': f'Status updated to {new_status}'})
    except Exception as e:
        return _err(e)


@app.route('/api/topic/<topic_id>')
def api_topic_detail(topic_id):
    if not _VALID_ID.match(topic_id):
        return jsonify({'error': 'Invalid topic id'}), 400
    try:
        topic = load_topic_by_id(topic_id)
        if not topic:
            return jsonify({'error': f'Topic {topic_id} not found'}), 404
        body = topic.get('body', '')
        return jsonify({
            'id': topic.get('id'), 'name': topic.get('name'), 'name_en': topic.get('name_en'),
            'area': topic.get('area'), 'direction': topic.get('direction'),
            'prerequisites': topic.get('prerequisites', []),
            'difficulty': topic.get('difficulty', 3), 'importance': topic.get('importance', 3),
            'status': topic.get('status', 'unknown'), 'tags': topic.get('tags', []),
            'description': body.strip().split('\n')[0][:500] if body else ''
        })
    except Exception as e:
        return _err(e)


# ============================================================
# 搜索 API
# ============================================================

@app.route('/api/search')
def api_search():
    try:
        # #10: query 长度上限 200 字符
        q = request.args.get('q', '').strip()[:200]
        if not q:
            return jsonify({'results': [], 'query': q, 'total': 0})
        limit = min(int(request.args.get('limit', 20)), 50)
        results = search_knowledge(q, limit=limit)
        return jsonify({'results': results, 'query': q, 'total': len(results)})
    except Exception as e:
        return _err(e)


# ============================================================
# 课程提示词 API
# ============================================================

@app.route('/api/course-prompt/<node_type>/<node_id>')
def api_course_prompt(node_type, node_id):
    if not _VALID_ID.match(node_id) or node_type not in ('area', 'direction', 'topic'):
        return jsonify({'error': 'Invalid parameters'}), 400
    try:
        result = build_cli_search_prompt(node_id, node_type=node_type)
        if not result:
            return jsonify({'error': f'{node_type} {node_id} not found'}), 404
        return jsonify(result)
    except Exception as e:
        return _err(e)


# ============================================================
# #30: 学习路径 API（从 vault/paths/*.yaml 读取）
# ============================================================

@app.route('/api/learning-paths')
def api_learning_paths():
    try:
        paths = load_learning_paths()
        return jsonify(paths)
    except Exception as e:
        return _err(e)


# ============================================================
# #14: 推荐引擎 API（接入已有 recommender.py）
# ============================================================

@app.route('/api/recommendations')
def api_recommendations():
    try:
        top_n = min(int(request.args.get('top_n', 5)), 10)
        recs = get_recommendations(top_n=top_n)
        return jsonify(recs)
    except Exception as e:
        return _err(e)


# ============================================================
# 启动
# ============================================================

if __name__ == '__main__':
    print("=" * 50)
    print("AI 知识图谱系统 v2 启动中...")
    port = int(os.environ.get('FLASK_PORT', '5001'))
    print(f"访问地址: http://localhost:{port}")
    print("=" * 50)
    # #1: debug 模式和监听地址通过环境变量控制，默认安全值
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    app.run(debug=DEBUG, host=host, port=port)
