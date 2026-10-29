"""Small in-memory cache for fully verified citizen answers."""

from __future__ import annotations

import time

_ANSWER_CACHE: dict[str, tuple[float, str, list, dict]] = {}
ANSWER_CACHE_TTL = 900  # 15 minutes
ANSWER_CACHE_MAX = 200


def get_cached_answer(key: str):
    if key in _ANSWER_CACHE:
        ts, answer, sources, meta = _ANSWER_CACHE[key]
        if time.time() - ts < ANSWER_CACHE_TTL:
            return answer, sources, meta
        del _ANSWER_CACHE[key]
    return None


def set_cached_answer(key: str, answer: str, sources: list, meta: dict) -> None:
    if len(_ANSWER_CACHE) > ANSWER_CACHE_MAX:
        _ANSWER_CACHE.clear()
    _ANSWER_CACHE[key] = (time.time(), answer, sources, meta)


def clear_cached_answers() -> None:
    _ANSWER_CACHE.clear()
