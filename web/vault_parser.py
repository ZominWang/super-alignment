"""
Vault Parser facade — re-exports from the services/ package.
All logic lives in web/services/; this module keeps backward compatibility
for any code that imports directly from vault_parser.
"""
# Vault loaders
from services.vault_loader import (
    load_areas, load_directions, load_topics,
    load_topic_by_id, load_direction_by_id,
    load_learning_paths,
)

# Quiz engine
from services.quiz_engine import (
    parse_quiz, strip_quiz_answers, validate_quiz_answer,
)

# State
from services.state_manager import update_status as update_topic_status

# Graph
from services.graph_builder import get_graph_data

# Progress
from services.progress import get_progress

# Diagnostics
from services.diagnostics import (
    get_global_diagnostic_questions, submit_global_diagnostic,
    get_direction_quiz, submit_direction_quiz,
)

# Search
from services.search import search_knowledge, build_cli_search_prompt

__all__ = [
    'load_areas', 'load_directions', 'load_topics',
    'load_topic_by_id', 'load_direction_by_id', 'load_learning_paths',
    'parse_quiz', 'strip_quiz_answers', 'validate_quiz_answer',
    'update_topic_status',
    'get_graph_data', 'get_progress',
    'get_global_diagnostic_questions', 'submit_global_diagnostic',
    'get_direction_quiz', 'submit_direction_quiz',
    'search_knowledge', 'build_cli_search_prompt',
]
