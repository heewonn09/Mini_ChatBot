from types import SimpleNamespace

from backend import main


class DummyConn:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, _):
        return 1


class DummyEngine:
    def connect(self):
        return DummyConn()


class FailingEngine:
    def connect(self):
        raise RuntimeError('db down')


class HealthyRedis:
    def ping(self):
        return True


def test_health_payload_degraded_when_redis_fallback(monkeypatch):
    monkeypatch.setattr(main, 'engine', DummyEngine())
    monkeypatch.setattr(main, 'redis_store', SimpleNamespace(client=None))

    payload, status_code = main._health_snapshot()

    assert status_code == 200
    assert payload['status'] == 'degraded'
    assert payload['checks']['database'] == 'healthy'
    assert payload['checks']['redis'] == 'degraded'


def test_health_payload_unhealthy_when_db_unavailable(monkeypatch):
    monkeypatch.setattr(main, 'engine', FailingEngine())
    monkeypatch.setattr(main, 'redis_store', SimpleNamespace(client=HealthyRedis()))

    payload, status_code = main._health_snapshot()

    assert status_code == 503
    assert payload['status'] == 'unhealthy'
    assert payload['checks']['database'] == 'unhealthy'
    assert payload['checks']['redis'] == 'healthy'
