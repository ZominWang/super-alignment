"""
Vault Parser - 解析三级知识图谱的 Obsidian vault .md 文件
三级结构：area (大类) -> direction (方向) -> topic (主题)
"""
import os
import re
import json
import random
import hashlib
import frontmatter


VAULT_PATH = os.path.join(os.path.dirname(__file__), '..', 'vault')
AREAS_PATH = os.path.join(VAULT_PATH, 'areas')
DIRECTIONS_PATH = os.path.join(VAULT_PATH, 'directions')
TOPICS_PATH = os.path.join(VAULT_PATH, 'topics')
STATE_FILE = os.path.join(os.path.dirname(__file__), 'data', 'state.json')


# ============================================================
# 状态持久化
# ============================================================

def _load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


_status_overrides = _load_state()

def _mark_tested(topic_ids):
    """标记哪些 topic 已经被测评过（即使成绩为 0，也与'从未测评'区分）"""
    tested = set(_status_overrides.get('__tested__', []))
    tested.update(topic_ids)
    _status_overrides['__tested__'] = list(tested)
    _save_state(_status_overrides)

def _is_tested(topic_id):
    return topic_id in set(_status_overrides.get('__tested__', []))


# ============================================================
# 数据加载函数
# ============================================================

def load_areas():
    """加载所有大类（Level 1）"""
    areas = []
    if not os.path.exists(AREAS_PATH):
        return areas

    for filename in sorted(os.listdir(AREAS_PATH)):
        if not filename.endswith('.md'):
            continue
        filepath = os.path.join(AREAS_PATH, filename)
        try:
            post = frontmatter.load(filepath)
            meta = dict(post.metadata)
            meta['body'] = post.content
            areas.append(meta)
        except Exception as e:
            print(f"Error loading area {filename}: {e}")

    return areas


def load_directions():
    """加载所有方向（Level 2）"""
    directions = []
    if not os.path.exists(DIRECTIONS_PATH):
        return directions

    for filename in sorted(os.listdir(DIRECTIONS_PATH)):
        if not filename.endswith('.md'):
            continue
        filepath = os.path.join(DIRECTIONS_PATH, filename)
        try:
            post = frontmatter.load(filepath)
            meta = dict(post.metadata)
            meta['body'] = post.content
            directions.append(meta)
        except Exception as e:
            print(f"Error loading direction {filename}: {e}")

    return directions


def load_topics():
    """加载所有主题（Level 3）"""
    topics = []
    if not os.path.exists(TOPICS_PATH):
        return topics

    for filename in sorted(os.listdir(TOPICS_PATH)):
        if not filename.endswith('.md'):
            continue
        filepath = os.path.join(TOPICS_PATH, filename)
        try:
            post = frontmatter.load(filepath)
            meta = dict(post.metadata)
            meta['body'] = post.content

            # 应用状态覆盖
            topic_id = meta.get('id', '')
            if topic_id in _status_overrides:
                meta['status'] = _status_overrides[topic_id]
            meta['tested'] = _is_tested(topic_id)

            topics.append(meta)
        except Exception as e:
            print(f"Error loading topic {filename}: {e}")

    return topics


def load_topic_by_id(topic_id):
    """根据 ID 加载单个主题"""
    filepath = os.path.join(TOPICS_PATH, f"{topic_id}.md")
    if not os.path.exists(filepath):
        return None

    try:
        post = frontmatter.load(filepath)
        meta = dict(post.metadata)
        meta['body'] = post.content

        if topic_id in _status_overrides:
            meta['status'] = _status_overrides[topic_id]
        meta['tested'] = _is_tested(topic_id)

        return meta
    except Exception as e:
        print(f"Error loading topic {topic_id}: {e}")
        return None


def load_direction_by_id(direction_id):
    """根据 ID 加载单个方向"""
    filepath = os.path.join(DIRECTIONS_PATH, f"{direction_id}.md")
    if not os.path.exists(filepath):
        return None
    try:
        post = frontmatter.load(filepath)
        meta = dict(post.metadata)
        meta['body'] = post.content
        return meta
    except Exception as e:
        print(f"Error loading direction {direction_id}: {e}")
        return None


# ============================================================
# Quiz 解析
# ============================================================

def parse_quiz(body, topic_id=''):
    """解析 body 中的 Quiz 题目，topic_id 用于确定性洗牌（消除答案位置偏差）"""
    questions = []

    quiz_match = re.search(r'## Quiz\s*\n(.*?)(?=\n## |\Z)', body, re.DOTALL)
    if not quiz_match:
        return questions

    quiz_content = quiz_match.group(1)
    q_blocks = re.split(r'\n### Q\d+\s*\n', quiz_content)
    q_blocks = [b.strip() for b in q_blocks if b.strip()]

    for i, block in enumerate(q_blocks):
        question = parse_single_question(block)
        if question:
            question['within_topic_q_index'] = i
            if topic_id:
                # 确定性洗牌：相同 topic+题序 每次洗出相同顺序，防止答案总在同一位置
                seed = int(hashlib.md5(f"{topic_id}:{i}".encode()).hexdigest()[:8], 16)
                rng = random.Random(seed)
                opts = list(question['options'])
                rng.shuffle(opts)
                letters = ['A', 'B', 'C', 'D']
                for j, opt in enumerate(opts):
                    opt['letter'] = letters[j]
                question['options'] = opts
                question['correct_index'] = next(
                    j for j, o in enumerate(opts) if o['correct']
                )
            questions.append(question)

    return questions


def parse_single_question(block):
    """解析单道题目"""
    try:
        q_match = re.search(r'\*\*问题\*\*[:：]\s*(.+?)(?=\n\n|-\s+[A-D]\.)', block, re.DOTALL)
        if not q_match:
            return None
        question_text = q_match.group(1).strip()

        options = []
        correct_index = -1
        option_matches = re.finditer(r'- ([A-D])\.\s+(.+?)(?=\n- [A-D]\.|\n\n|\Z)', block, re.DOTALL)

        for i, m in enumerate(option_matches):
            letter = m.group(1)
            text = m.group(2).strip()
            is_correct = '✓' in text
            text = text.replace('✓', '').strip()
            options.append({
                'letter': letter,
                'text': text,
                'correct': is_correct
            })
            if is_correct:
                correct_index = i

        if not options or correct_index == -1:
            return None

        explanation = ''
        exp_match = re.search(r'\*\*解析\*\*[:：]\s*(.+?)(?=\n### Q|\Z)', block, re.DOTALL)
        if exp_match:
            explanation = exp_match.group(1).strip()

        return {
            'question': question_text,
            'options': options,
            'correct_index': correct_index,
            'explanation': explanation
        }
    except Exception as e:
        print(f"Error parsing question: {e}")
        return None


# ============================================================
# 答案验证辅助（后端判分，防止前端伪造 is_correct）
# ============================================================

def strip_quiz_answers(questions):
    """移除题目中的正确答案信息，用于 GET 响应（防止前端直接读取答案）"""
    result = []
    for q in questions:
        q_copy = {k: v for k, v in q.items() if k != 'correct_index'}
        q_copy['options'] = [
            {k: v for k, v in opt.items() if k != 'correct'}
            for opt in q.get('options', [])
        ]
        result.append(q_copy)
    return result


def validate_quiz_answer(topic_id, within_topic_q_index, selected_index):
    """
    后端重新验证答案正确性。
    重新解析 vault 文件，用确定性洗牌后的 correct_index 对比用户选项。
    返回 (is_correct, correct_index, explanation)
    """
    topic = load_topic_by_id(topic_id)
    if not topic:
        return False, -1, ''

    qs = parse_quiz(topic.get('body', ''), topic_id=topic_id)
    if within_topic_q_index >= len(qs):
        return False, -1, ''

    q = qs[within_topic_q_index]
    correct_index = q.get('correct_index', -1)
    is_correct = (selected_index == correct_index)
    return is_correct, correct_index, q.get('explanation', '')


# ============================================================
# 状态更新
# ============================================================

def update_topic_status(topic_id, new_status):
    """更新主题状态（持久化到磁盘）"""
    valid_statuses = ['unknown', 'learning', 'mastered']
    if new_status not in valid_statuses:
        return False
    _status_overrides[topic_id] = new_status
    _save_state(_status_overrides)
    return True


# ============================================================
# 图谱数据
# ============================================================

def get_graph_data():
    """
    返回三级图谱数据：
    - area 节点（大）
    - direction 节点（中）
    - topic 节点（小）
    - 边：area->direction, direction->topic, topic->topic(prerequisites)
    """
    areas = load_areas()
    directions = load_directions()
    topics = load_topics()

    nodes = []
    links = []

    # 构建颜色映射
    area_colors = {a.get('id'): a.get('color', '#888888') for a in areas}

    # Area 节点
    for area in areas:
        aid = area.get('id')
        # 计算该大类下的掌握进度
        area_topics = [t for t in topics if t.get('area') == aid]
        mastered = sum(1 for t in area_topics if t.get('status') == 'mastered')
        total = len(area_topics)
        nodes.append({
            'id': aid,
            'name': area.get('name'),
            'name_en': area.get('name_en'),
            'type': 'area',
            'level': 1,
            'color': area.get('color', '#888888'),
            'icon': area.get('icon', ''),
            'description': area.get('description', ''),
            'direction_count': area.get('direction_count', 0),
            'mastered': mastered,
            'total': total,
        })

    # Direction 节点
    for direction in directions:
        did = direction.get('id')
        aid = direction.get('area')
        color = area_colors.get(aid, '#888888')

        dir_topics = [t for t in topics if t.get('direction') == did]
        mastered = sum(1 for t in dir_topics if t.get('status') == 'mastered')
        total = len(dir_topics)

        nodes.append({
            'id': did,
            'name': direction.get('name'),
            'name_en': direction.get('name_en'),
            'type': 'direction',
            'level': 2,
            'area': aid,
            'color': color,
            'description': direction.get('description', ''),
            'topic_count': direction.get('topic_count', 0),
            'mastered': mastered,
            'total': total,
        })

        # area -> direction 边
        if aid:
            links.append({
                'source': aid,
                'target': did,
                'type': 'area_direction'
            })

    # Topic 节点
    for topic in topics:
        tid = topic.get('id')
        aid = topic.get('area')
        did = topic.get('direction')
        color = area_colors.get(aid, '#888888')

        nodes.append({
            'id': tid,
            'name': topic.get('name'),
            'name_en': topic.get('name_en'),
            'type': 'topic',
            'level': 3,
            'area': aid,
            'direction': did,
            'color': color,
            'difficulty': topic.get('difficulty', 3),
            'importance': topic.get('importance', 3),
            'status': topic.get('status', 'unknown'),
            'tested': topic.get('tested', False),
            'tags': topic.get('tags', []),
            'description': (topic.get('body', '') or '').strip().split('\n')[0][:200]
        })

        # direction -> topic 边
        if did:
            links.append({
                'source': did,
                'target': tid,
                'type': 'direction_topic'
            })

        # 前置知识边（topic -> topic）
        for prereq in topic.get('prerequisites', []):
            links.append({
                'source': prereq,
                'target': tid,
                'type': 'prerequisite'
            })

    return {'nodes': nodes, 'links': links}


# ============================================================
# 全局诊断
# ============================================================

def get_global_diagnostic_questions(n_per_direction=2):
    """
    全局诊断：每个方向随机取 n 题，共 15*n 题
    每题附带 direction_id, area_id, topic_id 字段
    返回题目列表，已按方向分组排列（同一方向的题目连续出现）
    """
    directions = load_directions()
    topics = load_topics()

    # 建立 direction -> topics 的映射
    dir_topics_map = {}
    for d in directions:
        did = d.get('id')
        dir_topics_map[did] = {
            'direction': d,
            'topics': [t for t in topics if t.get('direction') == did]
        }

    all_questions = []

    for did, data in dir_topics_map.items():
        direction = data['direction']
        dir_topics = data['topics']
        dir_questions = []

        # 从该方向的所有 topic 收集题目
        for topic in dir_topics:
            body = topic.get('body', '')
            qs = parse_quiz(body, topic_id=topic.get('id', ''))
            for q in qs:
                q['topic_id'] = topic.get('id')
                q['topic_name'] = topic.get('name')
                q['direction_id'] = did
                q['direction_name'] = direction.get('name')
                q['area_id'] = direction.get('area')
                dir_questions.append(q)

        # 随机取 n_per_direction 题
        if len(dir_questions) >= n_per_direction:
            sampled = random.sample(dir_questions, n_per_direction)
        else:
            sampled = dir_questions

        all_questions.extend(sampled)

    return all_questions


def submit_global_diagnostic(answers):
    """
    提交全局诊断答案
    answers: list of {question_index, selected_index, direction_id, topic_id}

    返回：
    - direction_scores: {direction_id: {score, total, percent, name, area_id}}
    - radar_data: 适合 d3 雷达图的数据
    - weak_directions: 得分最低的方向列表
    - topic_status_updates: 批量更新的 topic 状态建议
    """
    if not answers:
        return {'error': 'No answers provided'}

    # 按方向统计
    dir_stats = {}  # direction_id -> {correct, total, topic_results}

    for ans in answers:
        did = ans.get('direction_id')
        tid = ans.get('topic_id')
        q_idx = ans.get('within_topic_q_index', ans.get('question_index', 0))
        selected = ans.get('selected_index', -1)

        # 后端重新验证，忽略客户端传来的 is_correct
        correct, _, _ = validate_quiz_answer(tid, q_idx, selected)

        if did not in dir_stats:
            dir_stats[did] = {'correct': 0, 'total': 0, 'topics': {}}
        dir_stats[did]['total'] += 1
        if correct:
            dir_stats[did]['correct'] += 1

        if tid not in dir_stats[did]['topics']:
            dir_stats[did]['topics'][tid] = {'correct': 0, 'total': 0}
        dir_stats[did]['topics'][tid]['total'] += 1
        if correct:
            dir_stats[did]['topics'][tid]['correct'] += 1

    # 获取方向信息
    directions = load_directions()
    dir_info = {d.get('id'): d for d in directions}

    direction_scores = {}
    radar_data = []

    for did, stats in dir_stats.items():
        d = dir_info.get(did, {})
        total = stats['total']
        correct = stats['correct']
        percent = round(correct / total * 100) if total > 0 else 0

        direction_scores[did] = {
            'name': d.get('name', did),
            'name_en': d.get('name_en', ''),
            'area_id': d.get('area', ''),
            'score': correct,
            'total': total,
            'percent': percent
        }

        radar_data.append({
            'axis': d.get('name', did),
            'direction_id': did,
            'value': percent / 100.0  # 归一化到 0-1
        })

    # 找出弱项方向（得分 < 60%）
    weak_directions = [
        {'direction_id': did, 'name': info['name'], 'percent': info['percent'], 'area_id': info['area_id']}
        for did, info in direction_scores.items()
        if info['percent'] < 60
    ]
    weak_directions.sort(key=lambda x: x['percent'])

    # 根据诊断结果批量更新 topic 状态
    # 该方向全对 -> mastered; 部分对 -> learning; 全错 -> unknown
    status_updates = {}
    for did, stats in dir_stats.items():
        for tid, t_stats in stats['topics'].items():
            t_total = t_stats['total']
            t_correct = t_stats['correct']
            if t_total == 0:
                continue
            if t_correct == t_total:
                new_status = 'mastered'
            elif t_correct > 0:
                new_status = 'learning'
            else:
                new_status = 'unknown'
            update_topic_status(tid, new_status)
            status_updates[tid] = new_status

    total_correct = sum(s['correct'] for s in dir_stats.values())
    # 标记所有被测评过的 topic
    tested_ids = list({ans.get('topic_id') for ans in answers if ans.get('topic_id')})
    _mark_tested(tested_ids)

    return {
        'direction_scores': direction_scores,
        'radar_data': radar_data,
        'weak_directions': weak_directions,
        'status_updates': status_updates,
        'total_questions': len(answers),
        'total_correct': total_correct
    }


# ============================================================
# 方向测评
# ============================================================

def get_direction_quiz(direction_id):
    """
    获取某方向的完整测评题目
    该方向所有 topic 的全部题（每个 topic 3 题，共 12 题）
    """
    direction = load_direction_by_id(direction_id)
    if not direction:
        return None

    topics = load_topics()
    dir_topics = sorted(
        [t for t in topics if t.get('direction') == direction_id],
        key=lambda t: (t.get('difficulty', 3), t.get('name', ''))
    )

    quiz_data = {
        'direction_id': direction_id,
        'direction_name': direction.get('name'),
        'direction_name_en': direction.get('name_en'),
        'area_id': direction.get('area'),
        'topics': []
    }

    all_questions = []
    for topic in dir_topics:
        body = topic.get('body', '')
        qs = parse_quiz(body, topic_id=topic.get('id', ''))
        topic_questions = []
        for q in qs:
            q['topic_id'] = topic.get('id')
            q['topic_name'] = topic.get('name')
            q['direction_id'] = direction_id
            topic_questions.append(q)
            all_questions.append(q)

        quiz_data['topics'].append({
            'topic_id': topic.get('id'),
            'topic_name': topic.get('name'),
            'topic_name_en': topic.get('name_en'),
            'status': topic.get('status', 'unknown'),
            'difficulty': topic.get('difficulty', 3),
            'question_count': len(topic_questions)
        })

    quiz_data['questions'] = all_questions
    quiz_data['total_questions'] = len(all_questions)

    return quiz_data


def submit_direction_quiz(direction_id, answers):
    """
    提交方向测评结果
    answers: list of {topic_id, question_index, selected_index, is_correct}
    返回：各 topic 掌握情况 + 方向整体得分 + 推荐下一步
    """
    if not answers:
        return {'error': 'No answers'}

    topics = load_topics()
    dir_topics = [t for t in topics if t.get('direction') == direction_id]
    dir_topic_ids = {t.get('id') for t in dir_topics}

    # 按 topic 统计（后端重新验证，忽略客户端传来的 is_correct）
    topic_stats = {}
    for ans in answers:
        tid = ans.get('topic_id')
        if tid not in dir_topic_ids:
            continue
        q_idx = ans.get('within_topic_q_index', ans.get('question_index', 0))
        selected = ans.get('selected_index', -1)
        is_correct, _, _ = validate_quiz_answer(tid, q_idx, selected)
        if tid not in topic_stats:
            topic_stats[tid] = {'correct': 0, 'total': 0}
        topic_stats[tid]['total'] += 1
        if is_correct:
            topic_stats[tid]['correct'] += 1

    # 更新状态
    topic_results = []
    for topic in dir_topics:
        tid = topic.get('id')
        stats = topic_stats.get(tid, {'correct': 0, 'total': 0})
        total = stats['total']
        correct = stats['correct']

        if total == 0:
            new_status = topic.get('status', 'unknown')
        elif correct == total:
            new_status = 'mastered'
        elif correct >= total - 1:
            new_status = 'learning'
        else:
            new_status = 'unknown'

        if total > 0:
            update_topic_status(tid, new_status)

        topic_results.append({
            'topic_id': tid,
            'topic_name': topic.get('name'),
            'correct': correct,
            'total': total,
            'percent': round(correct / total * 100) if total > 0 else 0,
            'new_status': new_status,
            'prerequisites': topic.get('prerequisites', [])
        })

    total_q = len(answers)

    # 按 topic 统计（重新基于服务端验证结果）
    validated_correct_count = sum(
        topic_stats.get(t.get('id'), {}).get('correct', 0)
        for t in dir_topics
    )
    total_c = validated_correct_count

    # 找出薄弱 topic（< 67%）
    weak_topics = [r for r in topic_results if r['total'] > 0 and r['percent'] < 67]

    # 标记所有被测评过的 topic
    tested_ids = list({ans.get('topic_id') for ans in answers if ans.get('topic_id')})
    _mark_tested(tested_ids)

    return {
        'direction_id': direction_id,
        'total_questions': total_q,
        'total_correct': total_c,
        'score_percent': round(total_c / total_q * 100) if total_q > 0 else 0,
        'topic_results': topic_results,
        'weak_topics': weak_topics
    }


# ============================================================
# 进度统计
# ============================================================

def get_progress():
    """获取整体进度统计（三级）"""
    areas = load_areas()
    directions = load_directions()
    topics = load_topics()

    total = len(topics)
    mastered = sum(1 for t in topics if t.get('status') == 'mastered')
    learning = sum(1 for t in topics if t.get('status') == 'learning')
    unknown_all = total - mastered - learning
    needs_work = sum(1 for t in topics if t.get('status') == 'unknown' and t.get('tested', False))
    not_tested = unknown_all - needs_work
    unknown = unknown_all  # 保持兼容

    # 按 area 统计
    area_stats = {}
    for area in areas:
        aid = area.get('id')
        area_topics = [t for t in topics if t.get('area') == aid]
        a_total = len(area_topics)
        a_mastered = sum(1 for t in area_topics if t.get('status') == 'mastered')
        a_learning = sum(1 for t in area_topics if t.get('status') == 'learning')

        # 按 direction 统计
        area_directions = [d for d in directions if d.get('area') == aid]
        dir_stats = {}
        for direction in area_directions:
            did = direction.get('id')
            dir_topics = [t for t in area_topics if t.get('direction') == did]
            d_total = len(dir_topics)
            d_mastered = sum(1 for t in dir_topics if t.get('status') == 'mastered')
            d_learning = sum(1 for t in dir_topics if t.get('status') == 'learning')
            dir_stats[did] = {
                'name': direction.get('name'),
                'color': area.get('color'),
                'total': d_total,
                'mastered': d_mastered,
                'learning': d_learning,
                'unknown': d_total - d_mastered - d_learning,
                'percent': round(d_mastered / d_total * 100) if d_total > 0 else 0
            }

        area_stats[aid] = {
            'name': area.get('name'),
            'icon': area.get('icon', ''),
            'color': area.get('color'),
            'total': a_total,
            'mastered': a_mastered,
            'learning': a_learning,
            'unknown': a_total - a_mastered - a_learning,
            'percent': round(a_mastered / a_total * 100) if a_total > 0 else 0,
            'directions': dir_stats
        }

    # 进度看板雷达图：5 个大类（可读性好于 15 个方向）
    area_radar_data = []
    for area in areas:
        aid = area.get('id')
        a_stat = area_stats.get(aid, {})
        area_radar_data.append({
            'axis': area.get('name'),
            'area_id': aid,
            'value': round(a_stat.get('percent', 0) / 100, 2)
        })

    # 诊断雷达图：15 个方向（细粒度，用于测评结果）
    direction_radar_data = []
    for direction in directions:
        did = direction.get('id')
        dir_topics = [t for t in topics if t.get('direction') == did]
        d_total = len(dir_topics)
        d_mastered = sum(1 for t in dir_topics if t.get('status') == 'mastered')
        direction_radar_data.append({
            'axis': direction.get('name'),
            'direction_id': did,
            'area_id': direction.get('area'),
            'value': round(d_mastered / d_total, 2) if d_total > 0 else 0
        })

    return {
        'total': total,
        'mastered': mastered,
        'learning': learning,
        'unknown': not_tested,    # 从未测评
        'needs_work': needs_work, # 测评过但未掌握
        'mastered_percent': round(mastered / total * 100) if total > 0 else 0,
        'areas': area_stats,
        'radar_data': area_radar_data,          # 进度看板用（5 轴）
        'direction_radar_data': direction_radar_data  # 备用（15 轴）
    }


# ============================================================
# 知识搜索
# ============================================================

def _score_text(query_tokens, text):
    """对文本字段打分，返回 0-100 的分值"""
    if not text:
        return 0
    text_lower = text.lower()
    score = 0
    for token in query_tokens:
        if token in text_lower:
            score += 1
    return min(100, score * 30)


def search_knowledge(query, limit=20):
    """
    全知识图谱搜索。
    对 area / direction / topic 的名称、标签、描述、内容做加权匹配。
    返回按得分排序的结果列表。
    """
    if not query or not query.strip():
        return []

    # 分词：按空格/标点切分，同时在 ASCII↔中文 边界处切分
    q = query.strip()
    # 在中文和ASCII之间插入空格，再统一分割
    q = re.sub(r'([一-鿿])([a-zA-Z0-9])', r'\1 \2', q)
    q = re.sub(r'([a-zA-Z0-9])([一-鿿])', r'\1 \2', q)
    raw_tokens = re.split(r'[\s，。、,./\\|]+', q.lower())
    tokens = [t for t in raw_tokens if len(t) >= 1]
    if not tokens:
        return []

    areas = load_areas()
    directions = load_directions()
    topics = load_topics()

    area_map = {a['id']: a for a in areas}
    dir_map = {d['id']: d for d in directions}

    results = []

    # --- 搜索 topics ---
    for topic in topics:
        score = 0
        name = topic.get('name', '')
        name_en = topic.get('name_en', '') or ''
        description = (topic.get('body', '') or '').split('##')[0]  # 正文第一段
        tags = ' '.join(topic.get('tags', []))

        name_lower = name.lower()
        name_en_lower = name_en.lower()

        for token in tokens:
            if token == name_lower or token == name_en_lower:
                score += 100
            elif token in name_lower or token in name_en_lower:
                score += 60
            if token in tags.lower():
                score += 40
            if token in description.lower():
                score += 15

        if score == 0:
            continue

        dir_info = dir_map.get(topic.get('direction', ''), {})
        area_info = area_map.get(topic.get('area', ''), {})

        results.append({
            'type': 'topic',
            'id': topic.get('id'),
            'name': name,
            'name_en': name_en,
            'score': score,
            'status': topic.get('status', 'unknown'),
            'tested': topic.get('tested', False),
            'difficulty': topic.get('difficulty', 3),
            'importance': topic.get('importance', 3),
            'description': description.strip()[:120],
            'direction_id': topic.get('direction', ''),
            'direction_name': dir_info.get('name', ''),
            'area_id': topic.get('area', ''),
            'area_name': area_info.get('name', ''),
            'area_color': area_info.get('color', '#888'),
            'tags': topic.get('tags', []),
        })

    # --- 搜索 directions ---
    for direction in directions:
        score = 0
        name = direction.get('name', '')
        name_en = direction.get('name_en', '') or ''
        description = direction.get('description', '') or ''

        name_lower = name.lower()
        name_en_lower = name_en.lower()

        for token in tokens:
            if token == name_lower or token == name_en_lower:
                score += 100
            elif token in name_lower or token in name_en_lower:
                score += 60
            if token in description.lower():
                score += 20

        if score == 0:
            continue

        area_info = area_map.get(direction.get('area', ''), {})

        results.append({
            'type': 'direction',
            'id': direction.get('id'),
            'name': name,
            'name_en': name_en,
            'score': score + 5,  # 方向略加分，展示更宽泛的匹配
            'description': description[:120],
            'area_id': direction.get('area', ''),
            'area_name': area_info.get('name', ''),
            'area_color': area_info.get('color', '#888'),
            'topic_count': direction.get('topic_count', 0),
        })

    # --- 搜索 areas ---
    for area in areas:
        score = 0
        name = area.get('name', '')
        name_en = area.get('name_en', '') or ''
        description = area.get('description', '') or ''

        name_lower = name.lower()
        name_en_lower = name_en.lower()

        for token in tokens:
            if token == name_lower or token == name_en_lower:
                score += 100
            elif token in name_lower or token in name_en_lower:
                score += 60
            if token in description.lower():
                score += 20

        if score == 0:
            continue

        results.append({
            'type': 'area',
            'id': area.get('id'),
            'name': name,
            'name_en': name_en,
            'score': score + 10,
            'description': description[:120],
            'color': area.get('color', '#888'),
            'icon': area.get('icon', ''),
            'direction_count': area.get('direction_count', 0),
        })

    results.sort(key=lambda x: -x['score'])
    return results[:limit]


def build_cli_search_prompt(node_id, node_type='topic'):
    """
    生成可以粘贴到本地 CLI AI Agent 的课程搜索提示词。
    node_type: 'topic' | 'direction' | 'area'
    """
    areas = load_areas()
    directions = load_directions()
    topics = load_topics()

    area_map = {a['id']: a for a in areas}
    dir_map = {d['id']: d for d in directions}
    topic_map = {t['id']: t for t in topics}

    if node_type == 'topic':
        node = topic_map.get(node_id)
        if not node:
            return None
        direction = dir_map.get(node.get('direction', ''), {})
        area = area_map.get(node.get('area', ''), {})
        name = node.get('name', '')
        name_en = node.get('name_en', '')
        tags = node.get('tags', [])
        context = f"属于 {area.get('name','')} > {direction.get('name','')} 方向"
        prompt = (
            f"请帮我搜索关于「{name}」（{name_en}）的学习资源。\n"
            f"背景：{context}。关键词：{', '.join(tags[:5])}。\n\n"
            f"请推荐：\n"
            f"1. 最权威的免费教程或文档（附链接）\n"
            f"2. 适合入门的视频课程（YouTube / Bilibili / 课程平台）\n"
            f"3. 相关论文或技术博客（如有）\n"
            f"4. 实践项目或代码示例\n\n"
            f"要求：优先中文资源，但如果中文资源质量不高可推荐英文原版。"
        )
    elif node_type == 'direction':
        node = dir_map.get(node_id)
        if not node:
            return None
        area = area_map.get(node.get('area', ''), {})
        name = node.get('name', '')
        name_en = node.get('name_en', '')
        prompt = (
            f"请帮我搜索「{name}」（{name_en}）方向的系统性学习路径和资源。\n"
            f"所属领域：{area.get('name','')}。\n\n"
            f"请推荐：\n"
            f"1. 该方向最好的入门到进阶的学习路线\n"
            f"2. 推荐课程（标注免费/付费、难度级别）\n"
            f"3. 必读书籍或文档\n"
            f"4. 实践项目建议\n\n"
            f"要求：给出具体的学习顺序，不要泛泛而谈。"
        )
    elif node_type == 'area':
        node = area_map.get(node_id)
        if not node:
            return None
        name = node.get('name', '')
        name_en = node.get('name_en', '')
        prompt = (
            f"请帮我了解「{name}」（{name_en}）这个 AI 大领域的全景。\n\n"
            f"请介绍：\n"
            f"1. 这个领域包含哪些核心方向（列出 3-5 个）\n"
            f"2. 学习该领域需要什么前置知识\n"
            f"3. 该领域目前最热门的方向是什么\n"
            f"4. 推荐的系统性学习资源（课程/书籍/社区）\n\n"
            f"要求：面向有一定 AI 基础的学习者，重点放在实用性上。"
        )
    else:
        return None

    return {
        'node_id': node_id,
        'node_type': node_type,
        'node_name': node.get('name', ''),
        'prompt': prompt
    }
