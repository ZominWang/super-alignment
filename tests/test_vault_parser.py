"""Core tests for vault parsing, quiz engine, graph builder, and progress (#31)."""
import os
import sys
import pytest

# Add web/ to path so imports work from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'web'))


# ── Vault loader ─────────────────────────────────────────────────

def test_load_areas_returns_list():
    from services.vault_loader import load_areas
    areas = load_areas()
    assert isinstance(areas, list)
    assert len(areas) > 0, "Should have at least one area"


def test_area_has_required_fields():
    from services.vault_loader import load_areas
    for area in load_areas():
        assert 'id' in area, "area missing id"
        assert 'name' in area, "area missing name"
        assert 'color' in area, "area missing color"


def test_load_directions_returns_list():
    from services.vault_loader import load_directions
    directions = load_directions()
    assert isinstance(directions, list)
    assert len(directions) >= 15, "Should have at least 15 directions"


def test_direction_has_required_fields():
    from services.vault_loader import load_directions
    for d in load_directions():
        assert 'id' in d
        assert 'name' in d
        assert 'area' in d


def test_direction_topic_count_auto_calculated():
    from services.vault_loader import load_directions
    for d in load_directions():
        assert 'topic_count' in d, f"direction {d.get('id')} missing topic_count"
        assert d['topic_count'] > 0, f"direction {d.get('id')} has 0 topics"


def test_load_topics_returns_list():
    from services.vault_loader import load_topics
    topics = load_topics()
    assert isinstance(topics, list)
    assert len(topics) >= 74, "Should have at least 74 topics"


def test_topic_has_required_fields():
    from services.vault_loader import load_topics
    for t in load_topics():
        assert 'id' in t
        assert 'name' in t
        assert 'area' in t
        assert 'direction' in t


def test_load_topic_by_id():
    from services.vault_loader import load_topic_by_id
    topic = load_topic_by_id('transformer_arch')
    assert topic is not None
    assert topic['id'] == 'transformer_arch'
    assert 'body' in topic


def test_load_topic_by_id_missing():
    from services.vault_loader import load_topic_by_id
    assert load_topic_by_id('nonexistent_topic_xyz') is None


def test_load_direction_by_id():
    from services.vault_loader import load_direction_by_id
    d = load_direction_by_id('llm_arch')
    assert d is not None
    assert d['id'] == 'llm_arch'


def test_load_direction_by_id_missing():
    from services.vault_loader import load_direction_by_id
    assert load_direction_by_id('nonexistent_dir_xyz') is None


def test_load_learning_paths():
    from services.vault_loader import load_learning_paths
    paths = load_learning_paths()
    assert isinstance(paths, list)
    assert len(paths) == 2, "Should have apply and understand paths"
    ids = {p['id'] for p in paths}
    assert 'apply' in ids
    assert 'understand' in ids


def test_learning_path_has_steps():
    from services.vault_loader import load_learning_paths
    for path in load_learning_paths():
        assert 'steps' in path
        assert len(path['steps']) >= 12


# ── Mtime cache ──────────────────────────────────────────────────

def test_cache_returns_same_object_on_second_call():
    from services.vault_loader import load_areas
    first = load_areas()
    second = load_areas()
    assert first is second, "Cache should return same list object on repeated calls"


# ── Quiz engine ───────────────────────────────────────────────────

SAMPLE_BODY = """
Some intro text.

## Quiz

### Q1
**问题**: What is 2 + 2?

- A. 3
- B. 4 ✓
- C. 5
- D. 6

**解析**: Basic arithmetic.

### Q2
**问题**: What color is the sky?

- A. Green
- B. Red
- C. Blue ✓
- D. Yellow

**解析**: The sky is blue.
"""


def test_parse_quiz_finds_questions():
    from services.quiz_engine import parse_quiz
    qs = parse_quiz(SAMPLE_BODY, topic_id='test')
    assert len(qs) == 2


def test_parse_quiz_correct_index():
    from services.quiz_engine import parse_quiz
    qs = parse_quiz(SAMPLE_BODY, topic_id='test')
    for q in qs:
        assert 'correct_index' in q
        assert q['correct_index'] >= 0


def test_parse_quiz_options():
    from services.quiz_engine import parse_quiz
    qs = parse_quiz(SAMPLE_BODY, topic_id='test')
    for q in qs:
        assert len(q['options']) == 4
        for opt in q['options']:
            assert 'letter' in opt
            assert 'text' in opt


def test_parse_quiz_deterministic_shuffle():
    from services.quiz_engine import parse_quiz
    qs1 = parse_quiz(SAMPLE_BODY, topic_id='my_topic')
    qs2 = parse_quiz(SAMPLE_BODY, topic_id='my_topic')
    assert qs1[0]['correct_index'] == qs2[0]['correct_index'], "Shuffle must be deterministic"


def test_parse_quiz_no_body():
    from services.quiz_engine import parse_quiz
    assert parse_quiz('') == []
    assert parse_quiz('No quiz here') == []


def test_strip_quiz_answers_removes_correct():
    from services.quiz_engine import parse_quiz, strip_quiz_answers
    qs = parse_quiz(SAMPLE_BODY, topic_id='test')
    stripped = strip_quiz_answers(qs)
    for q in stripped:
        assert 'correct_index' not in q
        for opt in q['options']:
            assert 'correct' not in opt


def test_validate_quiz_answer_correct():
    from services.quiz_engine import parse_quiz, validate_quiz_answer
    qs = parse_quiz(SAMPLE_BODY, topic_id='transformer_arch')
    # Find the correct index from parsed questions
    # We use transformer_arch as topic_id to get real validation
    topic_id = 'transformer_arch'
    from services.vault_loader import load_topic_by_id
    topic = load_topic_by_id(topic_id)
    if topic:
        real_qs = parse_quiz(topic['body'], topic_id=topic_id)
        if real_qs:
            q = real_qs[0]
            correct = q['correct_index']
            is_correct, idx, explanation = validate_quiz_answer(topic_id, 0, correct)
            assert is_correct is True
            assert idx == correct


def test_validate_quiz_answer_wrong():
    from services.quiz_engine import validate_quiz_answer, parse_quiz
    from services.vault_loader import load_topic_by_id
    topic = load_topic_by_id('transformer_arch')
    if topic:
        qs = parse_quiz(topic['body'], topic_id='transformer_arch')
        if qs:
            correct = qs[0]['correct_index']
            wrong = (correct + 1) % 4
            is_correct, _, _ = validate_quiz_answer('transformer_arch', 0, wrong)
            assert is_correct is False


def test_validate_quiz_answer_missing_topic():
    from services.quiz_engine import validate_quiz_answer
    is_correct, idx, explanation = validate_quiz_answer('nonexistent_xyz', 0, 0)
    assert is_correct is False
    assert idx == -1


# ── Graph builder ─────────────────────────────────────────────────

def test_get_graph_data_structure():
    from services.graph_builder import get_graph_data
    data = get_graph_data()
    assert 'nodes' in data
    assert 'links' in data
    assert len(data['nodes']) > 0
    assert len(data['links']) > 0


def test_graph_nodes_have_types():
    from services.graph_builder import get_graph_data
    data = get_graph_data()
    types = {n['type'] for n in data['nodes']}
    assert types == {'area', 'direction', 'topic'}


def test_graph_has_all_three_levels():
    from services.graph_builder import get_graph_data
    from services.vault_loader import load_areas, load_directions, load_topics
    data = get_graph_data()
    area_ids = {n['id'] for n in data['nodes'] if n['type'] == 'area'}
    dir_ids  = {n['id'] for n in data['nodes'] if n['type'] == 'direction'}
    topic_ids = {n['id'] for n in data['nodes'] if n['type'] == 'topic'}
    assert len(area_ids) == len(load_areas())
    assert len(dir_ids)  == len(load_directions())
    assert len(topic_ids) == len(load_topics())


def test_graph_links_reference_valid_nodes():
    from services.graph_builder import get_graph_data
    data = get_graph_data()
    node_ids = {n['id'] for n in data['nodes']}
    # area→direction and direction→topic links should resolve
    structural_links = [l for l in data['links'] if l['type'] in ('area_direction', 'direction_topic')]
    for link in structural_links:
        assert link['source'] in node_ids, f"source {link['source']} not in nodes"
        assert link['target'] in node_ids, f"target {link['target']} not in nodes"


# ── Progress stats ────────────────────────────────────────────────

def test_get_progress_keys():
    from services.progress import get_progress
    p = get_progress()
    for key in ('total', 'mastered', 'learning', 'untested', 'needs_work',
                'mastered_percent', 'areas', 'radar_data', 'direction_radar_data'):
        assert key in p, f"progress missing key: {key}"


def test_progress_counts_sum_correctly():
    from services.progress import get_progress
    p = get_progress()
    assert p['mastered'] + p['learning'] + p['needs_work'] + p['untested'] == p['total']


def test_progress_mastered_percent_range():
    from services.progress import get_progress
    p = get_progress()
    assert 0 <= p['mastered_percent'] <= 100


def test_progress_has_all_areas():
    from services.progress import get_progress
    from services.vault_loader import load_areas
    p = get_progress()
    area_ids = {a['id'] for a in load_areas()}
    assert set(p['areas'].keys()) == area_ids
