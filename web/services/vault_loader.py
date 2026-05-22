"""Vault .md file loader with mtime-based in-process cache (#29)."""
import os
import logging
import frontmatter
from typing import Any, Dict, List, Optional

from .state_manager import get_overrides, is_tested, STATE_FILE

logger = logging.getLogger(__name__)

_ROOT       = os.path.dirname(__file__)
VAULT_PATH  = os.path.normpath(os.path.join(_ROOT, '..', '..', 'vault'))
AREAS_PATH  = os.path.join(VAULT_PATH, 'areas')
DIRS_PATH   = os.path.join(VAULT_PATH, 'directions')
TOPICS_PATH = os.path.join(VAULT_PATH, 'topics')
PATHS_PATH  = os.path.join(VAULT_PATH, 'paths')

_cache: Dict[str, Any] = {}
_cache_mtimes: Dict[str, float] = {}


def _dir_mtime(path: str) -> float:
    """Max mtime across all .md/.yaml files in a directory."""
    if not os.path.exists(path):
        return 0.0
    try:
        exts = ('.md', '.yaml', '.yml')
        mtimes = [
            os.path.getmtime(os.path.join(path, f))
            for f in os.listdir(path) if f.endswith(exts)
        ]
        return max(mtimes, default=0.0)
    except Exception:
        return 0.0


def _get_cached(key: str, mtime: float, loader_fn):
    if key in _cache and _cache_mtimes.get(key) == mtime:
        return _cache[key]
    result = loader_fn()
    _cache[key] = result
    _cache_mtimes[key] = mtime
    return result


# ── Areas ────────────────────────────────────────────────────────

def load_areas() -> List[Dict]:
    return _get_cached('areas', _dir_mtime(AREAS_PATH), _load_areas_raw)


def _load_areas_raw() -> List[Dict]:
    areas = []
    if not os.path.exists(AREAS_PATH):
        return areas
    for fname in sorted(os.listdir(AREAS_PATH)):
        if not fname.endswith('.md'):
            continue
        try:
            post = frontmatter.load(os.path.join(AREAS_PATH, fname))
            meta = dict(post.metadata)
            meta['body'] = post.content
            areas.append(meta)
        except Exception as e:
            logger.warning("Error loading area %s: %s", fname, e)
    return areas


# ── Directions ───────────────────────────────────────────────────

def load_directions() -> List[Dict]:
    mtime = max(_dir_mtime(DIRS_PATH), _dir_mtime(TOPICS_PATH))
    return _get_cached('directions', mtime, _load_directions_raw)


def _load_directions_raw() -> List[Dict]:
    directions = []
    if not os.path.exists(DIRS_PATH):
        return directions
    for fname in sorted(os.listdir(DIRS_PATH)):
        if not fname.endswith('.md'):
            continue
        try:
            post = frontmatter.load(os.path.join(DIRS_PATH, fname))
            meta = dict(post.metadata)
            meta['body'] = post.content
            directions.append(meta)
        except Exception as e:
            logger.warning("Error loading direction %s: %s", fname, e)

    if os.path.exists(TOPICS_PATH):
        dir_counts: Dict[str, int] = {}
        for fname in os.listdir(TOPICS_PATH):
            if not fname.endswith('.md'):
                continue
            try:
                post = frontmatter.load(os.path.join(TOPICS_PATH, fname))
                did = post.metadata.get('direction')
                if did:
                    dir_counts[did] = dir_counts.get(did, 0) + 1
            except Exception:
                pass
        for d in directions:
            did = d.get('id')
            if did and did in dir_counts:
                d['topic_count'] = dir_counts[did]
    return directions


def load_direction_by_id(direction_id: str) -> Optional[Dict]:
    fpath = os.path.join(DIRS_PATH, f"{direction_id}.md")
    if not os.path.exists(fpath):
        return None
    try:
        post = frontmatter.load(fpath)
        meta = dict(post.metadata)
        meta['body'] = post.content
        return meta
    except Exception as e:
        logger.warning("Error loading direction %s: %s", direction_id, e)
        return None


# ── Topics ───────────────────────────────────────────────────────

def load_topics() -> List[Dict]:
    state_mtime = os.path.getmtime(STATE_FILE) if os.path.exists(STATE_FILE) else 0.0
    mtime = max(_dir_mtime(TOPICS_PATH), state_mtime)
    return _get_cached('topics', mtime, _load_topics_raw)


def _load_topics_raw() -> List[Dict]:
    topics = []
    overrides = get_overrides()
    if not os.path.exists(TOPICS_PATH):
        return topics
    for fname in sorted(os.listdir(TOPICS_PATH)):
        if not fname.endswith('.md'):
            continue
        try:
            post = frontmatter.load(os.path.join(TOPICS_PATH, fname))
            meta = dict(post.metadata)
            meta['body'] = post.content
            tid = meta.get('id', '')
            if tid in overrides:
                meta['status'] = overrides[tid]
            meta['tested'] = is_tested(tid)
            topics.append(meta)
        except Exception as e:
            logger.warning("Error loading topic %s: %s", fname, e)
    return topics


def load_topic_by_id(topic_id: str) -> Optional[Dict]:
    fpath = os.path.join(TOPICS_PATH, f"{topic_id}.md")
    if not os.path.exists(fpath):
        return None
    try:
        post = frontmatter.load(fpath)
        meta = dict(post.metadata)
        meta['body'] = post.content
        overrides = get_overrides()
        if topic_id in overrides:
            meta['status'] = overrides[topic_id]
        meta['tested'] = is_tested(topic_id)
        return meta
    except Exception as e:
        logger.warning("Error loading topic %s: %s", topic_id, e)
        return None


# ── Learning Paths (#30) ─────────────────────────────────────────

def load_learning_paths() -> List[Dict]:
    return _get_cached('paths', _dir_mtime(PATHS_PATH), _load_paths_raw)


def _load_paths_raw() -> List[Dict]:
    paths = []
    if not os.path.exists(PATHS_PATH):
        return paths
    import yaml
    for fname in sorted(os.listdir(PATHS_PATH)):
        if not fname.endswith(('.yaml', '.yml')):
            continue
        fpath = os.path.join(PATHS_PATH, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            if data:
                paths.append(data)
        except Exception as e:
            logger.warning("Error loading path %s: %s", fname, e)
    return paths
