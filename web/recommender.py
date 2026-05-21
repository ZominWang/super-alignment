"""
Recommender - 基于图的学习推荐引擎
推荐规则：prerequisites 全部 mastered 的 unknown 节点，按 importance 排序
"""
from vault_parser import load_topics, load_domains


def get_recommendations(top_n=5):
    """
    返回推荐的下一步学习节点（Top N）
    规则：
    1. 节点状态为 unknown
    2. 所有前置知识（prerequisites）都已 mastered 或节点没有前置知识
    3. 按 importance 降序排序，同 importance 按 difficulty 升序（先易后难）
    """
    topics = load_topics()
    domains = load_domains()

    # 构建状态查找表
    status_map = {t.get('id'): t.get('status', 'unknown') for t in topics}

    # 构建域名查找表
    domain_name_map = {d.get('id'): d.get('name') for d in domains}
    domain_color_map = {d.get('id'): d.get('color') for d in domains}

    candidates = []

    for topic in topics:
        topic_id = topic.get('id')
        status = topic.get('status', 'unknown')

        # 只推荐 unknown 状态的节点
        if status != 'unknown':
            continue

        prerequisites = topic.get('prerequisites', [])

        # 检查所有前置知识是否已掌握
        prereqs_met = all(
            status_map.get(prereq, 'unknown') == 'mastered'
            for prereq in prerequisites
        )

        if not prereqs_met:
            continue

        # 计算推荐理由
        reason = build_reason(topic, prerequisites, status_map, domain_name_map)

        domain_id = topic.get('domain', '')
        candidates.append({
            'id': topic_id,
            'name': topic.get('name'),
            'name_en': topic.get('name_en'),
            'domain': domain_id,
            'domain_name': domain_name_map.get(domain_id, domain_id),
            'domain_color': domain_color_map.get(domain_id, '#888888'),
            'difficulty': topic.get('difficulty', 3),
            'importance': topic.get('importance', 3),
            'status': status,
            'prerequisites': prerequisites,
            'reason': reason
        })

    # 排序：importance 降序，difficulty 升序
    candidates.sort(key=lambda x: (-x['importance'], x['difficulty']))

    return candidates[:top_n]


def build_reason(topic, prerequisites, status_map, domain_name_map):
    """构建推荐理由"""
    name = topic.get('name', '')
    importance = topic.get('importance', 3)
    difficulty = topic.get('difficulty', 3)
    domain_id = topic.get('domain', '')
    domain_name = domain_name_map.get(domain_id, domain_id)

    reasons = []

    # 基于重要性
    if importance == 5:
        reasons.append(f"这是{domain_name}领域的核心知识点，重要性极高")
    elif importance == 4:
        reasons.append(f"在{domain_name}领域中有很高的实用价值")
    else:
        reasons.append(f"属于{domain_name}的基础知识")

    # 基于前置知识
    if not prerequisites:
        reasons.append("无需任何前置知识，可以直接开始学习")
    elif len(prerequisites) == 1:
        prereq_status = status_map.get(prerequisites[0], 'unknown')
        if prereq_status == 'mastered':
            reasons.append("你已掌握所有前置知识，学习条件成熟")
    else:
        reasons.append(f"你已完成所有 {len(prerequisites)} 个前置知识点的学习")

    # 基于难度
    difficulty_desc = {1: "非常基础", 2: "入门级", 3: "中等难度", 4: "有一定挑战", 5: "高难度"}
    reasons.append(f"难度级别：{difficulty_desc.get(difficulty, '中等')}")

    return "；".join(reasons)


def get_learning_path(target_topic_id):
    """
    获取到达目标节点的最短学习路径
    """
    topics = load_topics()
    status_map = {t.get('id'): t.get('status', 'unknown') for t in topics}
    prereq_map = {t.get('id'): t.get('prerequisites', []) for t in topics}

    # BFS 找到需要学习的节点集合
    to_learn = []
    visited = set()

    def collect_prerequisites(topic_id):
        if topic_id in visited:
            return
        visited.add(topic_id)

        prereqs = prereq_map.get(topic_id, [])
        for prereq in prereqs:
            if status_map.get(prereq, 'unknown') != 'mastered':
                collect_prerequisites(prereq)

        if status_map.get(topic_id, 'unknown') != 'mastered':
            to_learn.append(topic_id)

    collect_prerequisites(target_topic_id)

    return to_learn
