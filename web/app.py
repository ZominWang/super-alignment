"""
AI 知识图谱系统 v2 - Flask 后端
三级知识结构：area -> direction -> topic
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify, request, render_template
from vault_parser import (
    load_areas, load_directions, load_topics,
    load_topic_by_id, load_direction_by_id,
    parse_quiz, update_topic_status,
    get_graph_data, get_progress,
    get_global_diagnostic_questions, submit_global_diagnostic,
    get_direction_quiz, submit_direction_quiz,
    search_knowledge, build_cli_search_prompt
)

app = Flask(__name__)
app.json.ensure_ascii = False


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
    """获取所有大类"""
    try:
        areas = load_areas()
        result = []
        for a in areas:
            result.append({
                'id': a.get('id'),
                'name': a.get('name'),
                'name_en': a.get('name_en'),
                'color': a.get('color'),
                'icon': a.get('icon'),
                'description': a.get('description'),
                'direction_count': a.get('direction_count')
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/directions')
def api_directions():
    """获取所有方向（可选按 area_id 过滤）"""
    try:
        area_id = request.args.get('area_id')
        directions = load_directions()
        if area_id:
            directions = [d for d in directions if d.get('area') == area_id]
        result = []
        for d in directions:
            result.append({
                'id': d.get('id'),
                'name': d.get('name'),
                'name_en': d.get('name_en'),
                'area': d.get('area'),
                'color': d.get('color'),
                'description': d.get('description'),
                'topic_count': d.get('topic_count')
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/topics')
def api_topics():
    """获取所有主题（可选按 direction_id 或 area_id 过滤）"""
    try:
        direction_id = request.args.get('direction_id')
        area_id = request.args.get('area_id')
        topics = load_topics()

        if direction_id:
            topics = [t for t in topics if t.get('direction') == direction_id]
        elif area_id:
            topics = [t for t in topics if t.get('area') == area_id]

        result = []
        for t in topics:
            result.append({
                'id': t.get('id'),
                'name': t.get('name'),
                'name_en': t.get('name_en'),
                'area': t.get('area'),
                'direction': t.get('direction'),
                'prerequisites': t.get('prerequisites', []),
                'difficulty': t.get('difficulty', 3),
                'importance': t.get('importance', 3),
                'status': t.get('status', 'unknown'),
                'tags': t.get('tags', [])
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/graph')
def api_graph():
    """返回三级知识图谱数据（节点和边）"""
    try:
        data = get_graph_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/progress')
def api_progress():
    """返回整体进度统计（三级）"""
    try:
        progress = get_progress()
        return jsonify(progress)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================
# 全局诊断 API
# ============================================================

@app.route('/api/diagnostic')
def api_diagnostic():
    """获取全局诊断题目（每方向2题，共30题）"""
    try:
        n = int(request.args.get('n_per_direction', 2))
        questions = get_global_diagnostic_questions(n_per_direction=n)
        return jsonify({
            'questions': questions,
            'total': len(questions)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/diagnostic/submit', methods=['POST'])
def api_diagnostic_submit():
    """提交全局诊断结果"""
    try:
        data = request.get_json()
        answers = data.get('answers', [])

        if not answers:
            return jsonify({'error': 'answers required'}), 400

        result = submit_global_diagnostic(answers)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================
# 方向测评 API
# ============================================================

@app.route('/api/direction/<direction_id>/quiz')
def api_direction_quiz(direction_id):
    """获取某方向的完整测评（4 topic × 3 题 = 12 题）"""
    try:
        quiz_data = get_direction_quiz(direction_id)
        if not quiz_data:
            return jsonify({'error': f'Direction {direction_id} not found'}), 404
        return jsonify(quiz_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/direction/<direction_id>/quiz/submit', methods=['POST'])
def api_direction_quiz_submit(direction_id):
    """提交方向测评结果"""
    try:
        data = request.get_json()
        answers = data.get('answers', [])

        if not answers:
            return jsonify({'error': 'answers required'}), 400

        result = submit_direction_quiz(direction_id, answers)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================
# 单题 Quiz API（保持兼容）
# ============================================================

@app.route('/api/quiz/<topic_id>')
def api_quiz(topic_id):
    """返回某个 topic 的题目"""
    try:
        topic = load_topic_by_id(topic_id)
        if not topic:
            return jsonify({'error': f'Topic {topic_id} not found'}), 404

        body = topic.get('body', '')
        questions = parse_quiz(body)

        return jsonify({
            'topic_id': topic_id,
            'topic_name': topic.get('name'),
            'topic_name_en': topic.get('name_en'),
            'description': body.strip().split('\n')[0][:300] if body else '',
            'difficulty': topic.get('difficulty', 3),
            'area': topic.get('area'),
            'direction': topic.get('direction'),
            'questions': questions,
            'current_status': topic.get('status', 'unknown')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/quiz/<topic_id>/submit', methods=['POST'])
def api_quiz_submit(topic_id):
    """提交单 topic 答案"""
    try:
        data = request.get_json()
        answers = data.get('answers', [])

        topic = load_topic_by_id(topic_id)
        if not topic:
            return jsonify({'error': f'Topic {topic_id} not found'}), 404

        body = topic.get('body', '')
        questions = parse_quiz(body)

        if not questions:
            return jsonify({'error': 'No questions found'}), 400

        correct_count = 0
        results = []

        for i, (q, user_answer) in enumerate(zip(questions, answers)):
            correct_idx = q.get('correct_index', -1)
            is_correct = (user_answer == correct_idx)
            if is_correct:
                correct_count += 1

            results.append({
                'question': q.get('question'),
                'user_answer': user_answer,
                'correct_index': correct_idx,
                'is_correct': is_correct,
                'explanation': q.get('explanation', ''),
                'options': q.get('options', [])
            })

        total = len(questions)
        if correct_count == total:
            new_status = 'mastered'
        elif correct_count >= total - 1:
            new_status = 'learning'
        else:
            new_status = 'unknown'

        update_topic_status(topic_id, new_status)

        return jsonify({
            'topic_id': topic_id,
            'topic_name': topic.get('name'),
            'score': correct_count,
            'total': total,
            'new_status': new_status,
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================
# 状态更新 API
# ============================================================

@app.route('/api/status/<topic_id>', methods=['POST'])
def api_update_status(topic_id):
    """手动更新节点状态"""
    try:
        data = request.get_json()
        new_status = data.get('status')

        if not new_status:
            return jsonify({'error': 'status field is required'}), 400

        topic = load_topic_by_id(topic_id)
        if not topic:
            return jsonify({'error': f'Topic {topic_id} not found'}), 404

        success = update_topic_status(topic_id, new_status)
        if not success:
            return jsonify({'error': f'Invalid status: {new_status}'}), 400

        return jsonify({
            'topic_id': topic_id,
            'status': new_status,
            'message': f'Status updated to {new_status}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/topic/<topic_id>')
def api_topic_detail(topic_id):
    """返回单个 topic 的详细信息"""
    try:
        topic = load_topic_by_id(topic_id)
        if not topic:
            return jsonify({'error': f'Topic {topic_id} not found'}), 404

        body = topic.get('body', '')
        description = body.strip().split('\n')[0][:500] if body else ''

        return jsonify({
            'id': topic.get('id'),
            'name': topic.get('name'),
            'name_en': topic.get('name_en'),
            'area': topic.get('area'),
            'direction': topic.get('direction'),
            'prerequisites': topic.get('prerequisites', []),
            'difficulty': topic.get('difficulty', 3),
            'importance': topic.get('importance', 3),
            'status': topic.get('status', 'unknown'),
            'tags': topic.get('tags', []),
            'description': description
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================
# 搜索 API
# ============================================================

@app.route('/api/search')
def api_search():
    """知识图谱搜索 — 对名称/标签/描述做加权匹配"""
    try:
        q = request.args.get('q', '').strip()
        if not q:
            return jsonify({'results': [], 'query': q, 'total': 0})
        limit = int(request.args.get('limit', 20))
        results = search_knowledge(q, limit=limit)
        return jsonify({'results': results, 'query': q, 'total': len(results)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/course-prompt/<node_type>/<node_id>')
def api_course_prompt(node_type, node_id):
    """生成可粘贴到本地 CLI AI Agent 的课程搜索提示词"""
    try:
        result = build_cli_search_prompt(node_id, node_type=node_type)
        if not result:
            return jsonify({'error': f'{node_type} {node_id} not found'}), 404
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("AI 知识图谱系统 v2 启动中...")
    print("访问地址: http://localhost:5001")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5001)
