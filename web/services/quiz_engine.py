"""Quiz parsing, answer stripping, and server-side validation."""
import re
import random
import hashlib
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


def parse_quiz(body: str, topic_id: str = '') -> List[Dict]:
    questions = []
    quiz_match = re.search(r'## Quiz\s*\n(.*?)(?=\n## |\Z)', body, re.DOTALL)
    if not quiz_match:
        return questions
    q_blocks = re.split(r'\n### Q\d+\s*\n', quiz_match.group(1))
    q_blocks = [b.strip() for b in q_blocks if b.strip()]
    for i, block in enumerate(q_blocks):
        question = _parse_single_question(block)
        if question:
            question['within_topic_q_index'] = i
            if topic_id:
                seed = int(hashlib.sha256(f"{topic_id}:{i}".encode()).hexdigest()[:16], 16)
                rng = random.Random(seed)
                opts = list(question['options'])
                rng.shuffle(opts)
                letters = ['A', 'B', 'C', 'D']
                for j, opt in enumerate(opts):
                    opt['letter'] = letters[j]
                question['options'] = opts
                question['correct_index'] = next(j for j, o in enumerate(opts) if o['correct'])
            questions.append(question)
    return questions


def _parse_single_question(block: str) -> Optional[Dict]:
    try:
        q_match = re.search(r'\*\*问题\*\*[:：]\s*(.+?)(?=\n\n|-\s+[A-D]\.)', block, re.DOTALL)
        if not q_match:
            return None
        question_text = q_match.group(1).strip()
        options = []
        correct_index = -1
        for i, m in enumerate(re.finditer(r'- ([A-D])\.\s+(.+?)(?=\n- [A-D]\.|\n\n|\Z)', block, re.DOTALL)):
            text = m.group(2).strip()
            is_correct = '✓' in text
            text = text.replace('✓', '').strip()
            options.append({'letter': m.group(1), 'text': text, 'correct': is_correct})
            if is_correct:
                correct_index = i
        if not options or correct_index == -1:
            return None
        explanation = ''
        exp_match = re.search(r'\*\*解析\*\*[:：]\s*(.+?)(?=\n### Q|\Z)', block, re.DOTALL)
        if exp_match:
            explanation = exp_match.group(1).strip()
        return {'question': question_text, 'options': options, 'correct_index': correct_index, 'explanation': explanation}
    except Exception as e:
        logger.warning("Error parsing question: %s", e)
        return None


def strip_quiz_answers(questions: List[Dict]) -> List[Dict]:
    """Remove correct_index and correct flag before sending to client."""
    result = []
    for q in questions:
        q_copy = {k: v for k, v in q.items() if k != 'correct_index'}
        q_copy['options'] = [{k: v for k, v in opt.items() if k != 'correct'} for opt in q.get('options', [])]
        result.append(q_copy)
    return result


def validate_quiz_answer(topic_id: str, within_topic_q_index: int, selected_index: int) -> Tuple[bool, int, str]:
    """Re-parse vault file and validate answer server-side."""
    from .vault_loader import load_topic_by_id
    topic = load_topic_by_id(topic_id)
    if not topic:
        return False, -1, ''
    qs = parse_quiz(topic.get('body', ''), topic_id=topic_id)
    if within_topic_q_index >= len(qs):
        return False, -1, ''
    q = qs[within_topic_q_index]
    correct_index = q.get('correct_index', -1)
    return (selected_index == correct_index), correct_index, q.get('explanation', '')
