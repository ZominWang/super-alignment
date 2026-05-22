"""Overall progress statistics."""
import logging
from typing import Any, Dict, List

from .vault_loader import load_areas, load_directions, load_topics

logger = logging.getLogger(__name__)


def get_progress() -> Dict[str, Any]:
    areas = load_areas()
    directions = load_directions()
    topics = load_topics()
    total = len(topics)
    mastered   = sum(1 for t in topics if t.get('status') == 'mastered')
    learning   = sum(1 for t in topics if t.get('status') == 'learning')
    needs_work = sum(1 for t in topics if t.get('status') == 'unknown' and t.get('tested', False))
    untested   = total - mastered - learning - needs_work

    area_stats: Dict[str, Dict] = {}
    for area in areas:
        aid = area.get('id')
        at = [t for t in topics if t.get('area') == aid]
        a_total    = len(at)
        a_mastered = sum(1 for t in at if t.get('status') == 'mastered')
        a_learning = sum(1 for t in at if t.get('status') == 'learning')
        dir_stats: Dict[str, Dict] = {}
        for d in [x for x in directions if x.get('area') == aid]:
            did = d.get('id')
            dt = [t for t in at if t.get('direction') == did]
            d_tot = len(dt)
            d_mas = sum(1 for t in dt if t.get('status') == 'mastered')
            d_lea = sum(1 for t in dt if t.get('status') == 'learning')
            dir_stats[did] = {
                'name': d.get('name'), 'color': area.get('color'),
                'total': d_tot, 'mastered': d_mas, 'learning': d_lea,
                'unknown': d_tot - d_mas - d_lea,
                'percent': round(d_mas / d_tot * 100) if d_tot > 0 else 0,
            }
        area_stats[aid] = {
            'name': area.get('name'), 'icon': area.get('icon', ''), 'color': area.get('color'),
            'total': a_total, 'mastered': a_mastered, 'learning': a_learning,
            'unknown': a_total - a_mastered - a_learning,
            'percent': round(a_mastered / a_total * 100) if a_total > 0 else 0,
            'directions': dir_stats,
        }

    area_radar = [
        {'axis': a.get('name'), 'area_id': a.get('id'),
         'value': round(area_stats.get(a.get('id'), {}).get('percent', 0) / 100, 2)}
        for a in areas
    ]
    dir_radar: List[Dict] = []
    for d in directions:
        did = d.get('id')
        dt = [t for t in topics if t.get('direction') == did]
        d_total = len(dt)
        d_mas = sum(1 for t in dt if t.get('status') == 'mastered')
        dir_radar.append({
            'axis': d.get('name'), 'direction_id': did, 'area_id': d.get('area'),
            'value': round(d_mas / d_total, 2) if d_total > 0 else 0,
        })

    return {
        'total': total, 'mastered': mastered, 'learning': learning,
        'untested': untested, 'unknown': untested, 'needs_work': needs_work,
        'mastered_percent': round(mastered / total * 100) if total > 0 else 0,
        'areas': area_stats,
        'radar_data': area_radar,
        'direction_radar_data': dir_radar,
    }
