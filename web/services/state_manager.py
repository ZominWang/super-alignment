"""Topic status persistence with threading safety."""
import os
import json
import threading
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

_ROOT      = os.path.dirname(__file__)
STATE_FILE = os.path.normpath(os.path.join(_ROOT, '..', 'data', 'state.json'))
_state_lock = threading.Lock()
_status_overrides: Dict = {}


def _load_state() -> Dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_state(state: Dict) -> None:
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def get_overrides() -> Dict:
    return _status_overrides


def mark_tested(topic_ids: List[str]) -> None:
    with _state_lock:
        _status_overrides.update(_load_state())
        tested = set(_status_overrides.get('__tested__', []))
        tested.update(topic_ids)
        _status_overrides['__tested__'] = list(tested)
        _save_state(_status_overrides)


def is_tested(topic_id: str) -> bool:
    return topic_id in set(_status_overrides.get('__tested__', []))


def update_status(topic_id: str, new_status: str) -> bool:
    if new_status not in ('unknown', 'learning', 'mastered'):
        return False
    with _state_lock:
        _status_overrides.update(_load_state())
        _status_overrides[topic_id] = new_status
        _save_state(_status_overrides)
    return True


# Initialise on import
_status_overrides.update(_load_state())
