import json
import os
import time
from typing import Any

import redis
from redis.exceptions import RedisError

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


class RedisStore:
    def __init__(self):
        self.client = None
        self._memory: dict[str, Any] = {}
        # (key -> expiry_epoch) for TTL-aware memory entries
        self._memory_ttl: dict[str, float] = {}
        try:
            self.client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            self.client.ping()
        except RedisError:
            self.client = None

    # ------------------------------------------------------------------
    # Internal helpers for in-process fallback
    # ------------------------------------------------------------------
    def _mem_get(self, key: str) -> Any | None:
        expiry = self._memory_ttl.get(key)
        if expiry is not None and time.monotonic() > expiry:
            self._memory.pop(key, None)
            self._memory_ttl.pop(key, None)
            return None
        return self._memory.get(key)

    def _mem_set(self, key: str, value: Any, ex_seconds: int | None = None) -> None:
        self._memory[key] = value
        if ex_seconds is not None:
            self._memory_ttl[key] = time.monotonic() + ex_seconds
        else:
            self._memory_ttl.pop(key, None)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def get_json(self, key: str) -> Any | None:
        if not self.client:
            return self._mem_get(key)
        value = self.client.get(key)
        return json.loads(value) if value else None

    def set_json(self, key: str, value: Any, ex_seconds: int = 300):
        if not self.client:
            self._mem_set(key, value, ex_seconds)
            return
        self.client.set(key, json.dumps(value, default=str), ex=ex_seconds)

    def incr_with_ttl(self, key: str, window_seconds: int) -> int:
        if not self.client:
            current = self._mem_get(key)
            new_count = int(current or 0) + 1
            # Only reset TTL on first increment so the window is fixed
            if current is None:
                self._mem_set(key, new_count, window_seconds)
            else:
                self._memory[key] = new_count
            return new_count
        pipe = self.client.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        count, _ = pipe.execute()
        return int(count)


redis_store = RedisStore()
