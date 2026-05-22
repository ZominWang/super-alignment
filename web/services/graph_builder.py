"""Knowledge graph node/link data builder."""
import logging
from typing import Any, Dict, List

from .vault_loader import load_areas, load_directions, load_topics

logger = logging.getLogger(__name__)


def get_graph_data() -> Dict[str, Any]:
    areas = load_areas()
    directions = load_directions()
    topics = load_topics()
    area_colors = {a.get('id'): a.get('color', '#888888') for a in areas}
    nodes: List[Dict] = []
    links: List[Dict] = []

    for area in areas:
        aid = area.get('id')
        at = [t for t in topics if t.get('area') == aid]
        nodes.append({
            'id': aid, 'name': area.get('name'), 'name_en': area.get('name_en'),
            'type': 'area', 'level': 1, 'color': area.get('color', '#888888'),
            'icon': area.get('icon', ''), 'description': area.get('description', ''),
            'direction_count': area.get('direction_count', 0),
            'mastered': sum(1 for t in at if t.get('status') == 'mastered'),
            'total': len(at),
        })

    for direction in directions:
        did = direction.get('id')
        aid = direction.get('area')
        dt = [t for t in topics if t.get('direction') == did]
        nodes.append({
            'id': did, 'name': direction.get('name'), 'name_en': direction.get('name_en'),
            'type': 'direction', 'level': 2, 'area': aid,
            'color': area_colors.get(aid, '#888888'),
            'description': direction.get('description', ''),
            'topic_count': direction.get('topic_count', 0),
            'mastered': sum(1 for t in dt if t.get('status') == 'mastered'),
            'total': len(dt),
        })
        if aid:
            links.append({'source': aid, 'target': did, 'type': 'area_direction'})

    for topic in topics:
        tid = topic.get('id')
        aid = topic.get('area')
        did = topic.get('direction')
        nodes.append({
            'id': tid, 'name': topic.get('name'), 'name_en': topic.get('name_en'),
            'type': 'topic', 'level': 3, 'area': aid, 'direction': did,
            'color': area_colors.get(aid, '#888888'),
            'difficulty': topic.get('difficulty', 3), 'importance': topic.get('importance', 3),
            'status': topic.get('status', 'unknown'), 'tested': topic.get('tested', False),
            'tags': topic.get('tags', []),
            'description': (topic.get('body', '') or '').strip().split('\n')[0][:200],
        })
        if did:
            links.append({'source': did, 'target': tid, 'type': 'direction_topic'})
        for prereq in topic.get('prerequisites', []):
            links.append({'source': prereq, 'target': tid, 'type': 'prerequisite'})

    return {'nodes': nodes, 'links': links}
