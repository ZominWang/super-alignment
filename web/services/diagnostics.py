"""Global and direction-level diagnostic quiz functions."""
import random
import logging
from typing import Any, Dict, List, Optional

from .vault_loader import load_directions, load_topics, load_direction_by_id
from .quiz_engine import parse_quiz, validate_quiz_answer
from .state_manager import mark_tested, update_status

logger = logging.getLogger(__name__)


def get_global_diagnostic_questions(n_per_direction: int = 2) -> List[Dict]:
    directions = load_directions()
    topics = load_topics()
    all_questions: List[Dict] = []
    for direction in directions:
        did = direction.get('id')
        dir_questions: List[Dict] = []
        for topic in [t for t in topics if t.get('direction') == did]:
            qs = parse_quiz(topic.get('body', ''), topic_id=topic.get('id', ''))
            for q in qs:
                q.update({
                    'topic_id': topic.get('id'), 'topic_name': topic.get('name'),
                    'direction_id': did, 'direction_name': direction.get('name'),
                    'area_id': direction.get('area'),
                })
                dir_questions.append(q)
        sampled = random.sample(dir_questions, n_per_direction) if len(dir_questions) >= n_per_direction else dir_questions
        all_questions.extend(sampled)
    return all_questions


def submit_global_diagnostic(answers: List[Dict]) -> Dict[str, Any]:
    if not answers:
        return {'error': 'No answers provided'}

    dir_stats: Dict[str, Dict] = {}
    for ans in answers:
        did = ans.get('direction_id')
        tid = ans.get('topic_id')
        q_idx = ans.get('within_topic_q_index', ans.get('question_index', 0))
        correct, _, _ = validate_quiz_answer(tid, q_idx, ans.get('selected_index', -1))
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

    dir_info = {d.get('id'): d for d in load_directions()}
    direction_scores: Dict[str, Dict] = {}
    radar_data: List[Dict] = []
    for did, stats in dir_stats.items():
        d = dir_info.get(did, {})
        total = stats['total']
        correct = stats['correct']
        pct = round(correct / total * 100) if total > 0 else 0
        direction_scores[did] = {
            'name': d.get('name', did), 'name_en': d.get('name_en', ''),
            'area_id': d.get('area', ''), 'score': correct, 'total': total, 'percent': pct,
        }
        radar_data.append({'axis': d.get('name', did), 'direction_id': did, 'value': pct / 100.0})

    weak_directions = [
        {'direction_id': did, 'name': i['name'], 'percent': i['percent'], 'area_id': i['area_id']}
        for did, i in direction_scores.items() if i['percent'] < 60
    ]
    weak_directions.sort(key=lambda x: x['percent'])

    status_updates: Dict[str, str] = {}
    for stats in dir_stats.values():
        for tid, t_stats in stats['topics'].items():
            t_total = t_stats['total']
            if t_total == 0:
                continue
            t_correct = t_stats['correct']
            ns = 'mastered' if t_correct == t_total else ('learning' if t_correct > 0 else 'unknown')
            update_status(tid, ns)
            status_updates[tid] = ns

    mark_tested(list({a.get('topic_id') for a in answers if a.get('topic_id')}))
    total_correct = sum(s['correct'] for s in dir_stats.values())
    return {
        'direction_scores': direction_scores, 'radar_data': radar_data,
        'weak_directions': weak_directions, 'status_updates': status_updates,
        'total_questions': len(answers), 'total_correct': total_correct,
    }


def get_direction_quiz(direction_id: str) -> Optional[Dict[str, Any]]:
    direction = load_direction_by_id(direction_id)
    if not direction:
        return None
    topics = load_topics()
    dir_topics = sorted(
        [t for t in topics if t.get('direction') == direction_id],
        key=lambda t: (t.get('difficulty', 3), t.get('name', ''))
    )
    quiz_data: Dict[str, Any] = {
        'direction_id': direction_id,
        'direction_name': direction.get('name'),
        'direction_name_en': direction.get('name_en'),
        'area_id': direction.get('area'),
        'topics': [],
    }
    all_questions: List[Dict] = []
    for topic in dir_topics:
        qs = parse_quiz(topic.get('body', ''), topic_id=topic.get('id', ''))
        topic_qs = []
        for q in qs:
            q.update({'topic_id': topic.get('id'), 'topic_name': topic.get('name'), 'direction_id': direction_id})
            topic_qs.append(q)
            all_questions.append(q)
        quiz_data['topics'].append({
            'topic_id': topic.get('id'), 'topic_name': topic.get('name'),
            'topic_name_en': topic.get('name_en'), 'status': topic.get('status', 'unknown'),
            'difficulty': topic.get('difficulty', 3), 'question_count': len(topic_qs),
        })
    quiz_data['questions'] = all_questions
    quiz_data['total_questions'] = len(all_questions)
    return quiz_data


def submit_direction_quiz(direction_id: str, answers: List[Dict]) -> Dict[str, Any]:
    if not answers:
        return {'error': 'No answers'}
    topics = load_topics()
    dir_topics = [t for t in topics if t.get('direction') == direction_id]
    dir_topic_ids = {t.get('id') for t in dir_topics}

    topic_stats: Dict[str, Dict] = {}
    for ans in answers:
        tid = ans.get('topic_id')
        if tid not in dir_topic_ids:
            continue
        q_idx = ans.get('within_topic_q_index', ans.get('question_index', 0))
        is_correct, _, _ = validate_quiz_answer(tid, q_idx, ans.get('selected_index', -1))
        if tid not in topic_stats:
            topic_stats[tid] = {'correct': 0, 'total': 0}
        topic_stats[tid]['total'] += 1
        if is_correct:
            topic_stats[tid]['correct'] += 1

    topic_results: List[Dict] = []
    for topic in dir_topics:
        tid = topic.get('id')
        stats = topic_stats.get(tid, {'correct': 0, 'total': 0})
        total = stats['total']
        correct = stats['correct']
        if total == 0:
            ns = topic.get('status', 'unknown')
        elif correct == total:
            ns = 'mastered'
        elif correct >= total - 1:
            ns = 'learning'
        else:
            ns = 'unknown'
        if total > 0:
            update_status(tid, ns)
        topic_results.append({
            'topic_id': tid, 'topic_name': topic.get('name'),
            'correct': correct, 'total': total,
            'percent': round(correct / total * 100) if total > 0 else 0,
            'new_status': ns, 'prerequisites': topic.get('prerequisites', []),
        })

    total_q = len(answers)
    total_c = sum(topic_stats.get(t.get('id'), {}).get('correct', 0) for t in dir_topics)
    mark_tested(list({a.get('topic_id') for a in answers if a.get('topic_id')}))
    return {
        'direction_id': direction_id,
        'total_questions': total_q, 'total_correct': total_c,
        'score_percent': round(total_c / total_q * 100) if total_q > 0 else 0,
        'topic_results': topic_results,
        'weak_topics': [r for r in topic_results if r['total'] > 0 and r['percent'] < 67],
    }
