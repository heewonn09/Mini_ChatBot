"""Tests for API endpoints — uses TestClient with in-memory DB."""
import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture(scope="module")
def api():
    with TestClient(app) as c:
        yield c


# ── Health & root ─────────────────────────────────────────────────────────────

def test_root(api):
    r = api.get("/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_health_ok(api):
    r = api.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in ("healthy", "degraded")
    assert body["db"] == "ok"


def test_health_has_redis_key(api):
    r = api.get("/health")
    assert "redis" in r.json()


# ── Auth: signup + login ──────────────────────────────────────────────────────

def test_signup_and_login(api):
    r = api.post("/api/auth/signup", json={
        "username": "pytest_user",
        "email": "pytest@test.com",
        "password": "Test1234!",
    })
    # 201 (created) or 400 (already exists from previous run) are both OK
    assert r.status_code in (201, 200, 400)

    r2 = api.post("/api/auth/login", json={
        "username_or_email": "pytest_user",
        "password": "Test1234!",
    })
    assert r2.status_code == 200
    body = r2.json()
    assert "access_token" in body
    assert body["user"]["username"] == "pytest_user"


def test_login_wrong_password(api):
    r = api.post("/api/auth/login", json={
        "username_or_email": "pytest_user",
        "password": "wrong",
    })
    assert r.status_code in (400, 401, 422)


# ── Protected route requires auth ─────────────────────────────────────────────

def test_profile_without_token_rejected(api):
    r = api.get("/api/ui/1/profile")
    assert r.status_code in (401, 403)


# ── Preferences default values ────────────────────────────────────────────────

def _get_token(api) -> tuple[str, int]:
    r = api.post("/api/auth/login", json={
        "username_or_email": "pytest_user",
        "password": "Test1234!",
    })
    body = r.json()
    return body["access_token"], body["user"]["id"]


def test_preferences_defaults(api):
    tok, uid = _get_token(api)
    r = api.get(f"/api/ui/{uid}/preferences",
                headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200
    body = r.json()
    assert body["language"] == "ko"
    assert body["theme"] in ("light", "dark")  # may have been patched
    assert isinstance(body["notifications_enabled"], bool)


def test_preferences_patch(api):
    tok, uid = _get_token(api)
    r = api.patch(
        f"/api/ui/{uid}/preferences",
        headers={"Authorization": f"Bearer {tok}"},
        json={"theme": "dark"},
    )
    assert r.status_code == 200
    assert r.json()["theme"] == "dark"
