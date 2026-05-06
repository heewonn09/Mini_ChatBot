import json
import os
from typing import Any

import redis
from redis.exceptions import RedisError

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


class RedisStore:
    def __init__(self):
        self.client = None
        self._memory = {}
        try:
            self.client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            self.client.ping()
        except RedisError:
            self.client = None

    def get_json(self, key: str) -> Any | None:
        if not self.client:
            return self._memory.get(key)
        value = self.client.get(key)
        return json.loads(value) if value else None

    def set_json(self, key: str, value: Any, ex_seconds: int = 300):
        if not self.client:
            self._memory[key] = value
            return
        self.client.set(key, json.dumps(value, default=str), ex=ex_seconds)

    def incr_with_ttl(self, key: str, window_seconds: int) -> int:
        if not self.client:
            self._memory[key] = int(self._memory.get(key, 0)) + 1
            return self._memory[key]
        pipe = self.client.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        count, _ = pipe.execute()
        return int(count)


redis_store = RedisStore()
