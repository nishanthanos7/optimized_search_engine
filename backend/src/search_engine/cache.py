import time

CACHE: dict[str, tuple[float, list]] = {}


def get_cached(key: str):
    if key in CACHE:
        timestamp, data = CACHE[key]
        if time.time() - timestamp < 300:
            return data
        del CACHE[key]
    return None


def set_cached(key: str, data: list):
    if len(CACHE) > 500:
        CACHE.clear()
    CACHE[key] = (time.time(), data)