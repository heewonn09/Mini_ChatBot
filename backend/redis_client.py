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

    def delete(self, key: str) -> None:
        if not self.client:
            self._memory.pop(key, None)
            self._memory_ttl.pop(key, None)
            return
        self.client.delete(key)

    def incr_with_ttl(self, key: str, window_seconds: int) -> int:
        if not self.client:
            current = self._mem_get(key)
            new_count = int(current or 0) + 1
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

    # ------------------------------------------------------------------
    # Token blacklist (for logout / token revocation)
    # ------------------------------------------------------------------
    def blacklist_token(self, jti: str, ttl_seconds: int) -> None:
        key = f"blacklist:{jti}"
        if self.client:
            self.client.setex(key, ttl_seconds, "1")
        else:
            self._mem_set(key, "1", ttl_seconds)

    def is_token_blacklisted(self, jti: str) -> bool:
        key = f"blacklist:{jti}"
        if self.client:
            return self.client.exists(key) > 0
        return self._mem_get(key) is not None

    # ------------------------------------------------------------------
    # Auth rate limiting
    # ------------------------------------------------------------------
    def check_auth_rate_limit(self, ip: str, limit: int = 10, window: int = 60) -> bool:
        """Returns True if request is allowed, False if rate-limited."""
        key = f"auth:rate:{ip}"
        count = self.incr_with_ttl(key, window)
        return count <= limit

    # ------------------------------------------------------------------
    # Password reset tokens
    # ------------------------------------------------------------------
    def set_reset_token(self, token: str, email: str, ttl: int = 3600) -> None:
        self.set_json(f"reset:{token}", {"email": email}, ex_seconds=ttl)

    def get_reset_email(self, token: str) -> str | None:
        data = self.get_json(f"reset:{token}")
        return data["email"] if data else None

    def delete_reset_token(self, token: str) -> None:
        self.delete(f"reset:{token}")


redis_store = RedisStore()
