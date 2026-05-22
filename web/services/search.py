"""Full-text knowledge search and CLI course prompt builder."""
import re
import logging
from typing import Any, Dict, List, Optional

from .vault_loader import load_areas, load_directions, load_topics

logger = logging.getLogger(__name__)


def search_knowledge(query: str, limit: int = 20) -> List[Dict]:
    if not query or not query.strip():
        return []
    q = query.strip()
    q = re.sub(r'([一-鿿])([a-zA-Z0-9])', r'\1 \2', q)
    q = re.sub(r'([a-zA-Z0-9])([一-鿿])', r'\1 \2', q)
    tokens = [t for t in re.split(r'[\s，。、,./\\|]+', q.lower()) if t]
    if not tokens:
        return []

    areas = load_areas()
    directions = load_directions()
    topics = load_topics()
    area_map = {a['id']: a for a in areas}
    dir_map  = {d['id']: d for d in directions}
    results: List[Dict] = []

    for topic in topics:
        body_intro = (topic.get('body', '') or '').split('##')[0]
        score = _score(tokens, topic.get('name', ''), topic.get('name_en', '') or '',
                       body_intro, ' '.join(topic.get('tags', [])), desc_weight=15)
        if score == 0:
            continue
        dir_info  = dir_map.get(topic.get('direction', ''), {})
        area_info = area_map.get(topic.get('area', ''), {})
        results.append({
            'type': 'topic', 'id': topic.get('id'),
            'name': topic.get('name'), 'name_en': topic.get('name_en'),
            'score': score, 'status': topic.get('status', 'unknown'),
            'tested': topic.get('tested', False),
            'difficulty': topic.get('difficulty', 3), 'importance': topic.get('importance', 3),
            'description': body_intro.strip()[:120],
            'direction_id': topic.get('direction', ''), 'direction_name': dir_info.get('name', ''),
            'area_id': topic.get('area', ''), 'area_name': area_info.get('name', ''),
            'area_color': area_info.get('color', '#888'), 'tags': topic.get('tags', []),
        })

    for direction in directions:
        score = _score(tokens, direction.get('name', ''), direction.get('name_en', '') or '',
                       direction.get('description', '') or '')
        if score == 0:
            continue
        area_info = area_map.get(direction.get('area', ''), {})
        results.append({
            'type': 'direction', 'id': direction.get('id'),
            'name': direction.get('name'), 'name_en': direction.get('name_en'),
            'score': score + 5, 'description': (direction.get('description', '') or '')[:120],
            'area_id': direction.get('area', ''), 'area_name': area_info.get('name', ''),
            'area_color': area_info.get('color', '#888'),
            'topic_count': direction.get('topic_count', 0),
        })

    for area in areas:
        score = _score(tokens, area.get('name', ''), area.get('name_en', '') or '',
                       area.get('description', '') or '')
        if score == 0:
            continue
        results.append({
            'type': 'area', 'id': area.get('id'),
            'name': area.get('name'), 'name_en': area.get('name_en'),
            'score': score + 10, 'description': (area.get('description', '') or '')[:120],
            'color': area.get('color', '#888'), 'icon': area.get('icon', ''),
            'direction_count': area.get('direction_count', 0),
        })

    results.sort(key=lambda x: -x['score'])
    return results[:limit]


def _score(tokens: List[str], name: str, name_en: str,
           description: str, tags: str = '', desc_weight: int = 20) -> int:
    score = 0
    nl = name.lower()
    nel = name_en.lower()
    for token in tokens:
        if token == nl or token == nel:
            score += 100
        elif token in nl or token in nel:
            score += 60
        if tags and token in tags.lower():
            score += 40
        if description and token in description.lower():
            score += desc_weight
    return score


def build_cli_search_prompt(node_id: str, node_type: str = 'topic') -> Optional[Dict[str, Any]]:
    areas = load_areas()
    directions = load_directions()
    topics = load_topics()
    area_map  = {a['id']: a for a in areas}
    dir_map   = {d['id']: d for d in directions}
    topic_map = {t['id']: t for t in topics}

    if node_type == 'topic':
        node = topic_map.get(node_id)
        if not node:
            return None
        direction = dir_map.get(node.get('direction', ''), {})
        area = area_map.get(node.get('area', ''), {})
        name, name_en = node.get('name', ''), node.get('name_en', '')
        tags = node.get('tags', [])
        context = f"属于 {area.get('name','')} > {direction.get('name','')} 方向"
        prompt = (
            f"请帮我搜索关于「{name}」（{name_en}）的学习资源。\n"
            f"背景：{context}。关键词：{', '.join(tags[:5])}。\n\n"
            f"请推荐：\n1. 最权威的免费教程或文档（附链接）\n"
            f"2. 适合入门的视频课程（YouTube / Bilibili / 课程平台）\n"
            f"3. 相关论文或技术博客（如有）\n4. 实践项目或代码示例\n\n"
            f"要求：优先中文资源，但如果中文资源质量不高可推荐英文原版。"
        )
    elif node_type == 'direction':
        node = dir_map.get(node_id)
        if not node:
            return None
        area = area_map.get(node.get('area', ''), {})
        name, name_en = node.get('name', ''), node.get('name_en', '')
        prompt = (
            f"请帮我搜索「{name}」（{name_en}）方向的系统性学习路径和资源。\n"
            f"所属领域：{area.get('name','')}。\n\n"
            f"请推荐：\n1. 该方向最好的入门到进阶的学习路线\n"
            f"2. 推荐课程（标注免费/付费、难度级别）\n3. 必读书籍或文档\n4. 实践项目建议\n\n"
            f"要求：给出具体的学习顺序，不要泛泛而谈。"
        )
    elif node_type == 'area':
        node = area_map.get(node_id)
        if not node:
            return None
        name, name_en = node.get('name', ''), node.get('name_en', '')
        prompt = (
            f"请帮我了解「{name}」（{name_en}）这个 AI 大领域的全景。\n\n"
            f"请介绍：\n1. 这个领域包含哪些核心方向（列出 3-5 个）\n"
            f"2. 学习该领域需要什么前置知识\n3. 该领域目前最热门的方向是什么\n"
            f"4. 推荐的系统性学习资源（课程/书籍/社区）\n\n"
            f"要求：面向有一定 AI 基础的学习者，重点放在实用性上。"
        )
    else:
        return None

    return {'node_id': node_id, 'node_type': node_type, 'node_name': node.get('name', ''), 'prompt': prompt}
