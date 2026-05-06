import unittest

try:
    from backend.redis_client import RedisStore
except ModuleNotFoundError:  # pragma: no cover - test env dependency guard
    RedisStore = None


class RedisStoreTest(unittest.TestCase):
    @unittest.skipIf(RedisStore is None, "redis package not installed in test environment")
    def test_memory_fallback_set_get_json(self):
        store = RedisStore()
        store.client = None  # force memory mode
        payload = {"hello": "world", "count": 3}
        store.set_json("k1", payload)
        self.assertEqual(store.get_json("k1"), payload)

    @unittest.skipIf(RedisStore is None, "redis package not installed in test environment")
    def test_memory_incr_with_ttl(self):
        store = RedisStore()
        store.client = None  # force memory mode
        self.assertEqual(store.incr_with_ttl("rate:test", 10), 1)
        self.assertEqual(store.incr_with_ttl("rate:test", 10), 2)


if __name__ == "__main__":
    unittest.main()
