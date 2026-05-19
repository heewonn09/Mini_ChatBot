"""Tests for behavior log CRUD endpoints."""
import pytest
from fastapi.testclient import TestClient

from backend.main import app

_EMAIL = "behavior_test@mindflow.test"
_PW = "Behavior123!"
_USERNAME = "behavior_tester"


@pytest.fixture(scope="module")
def api():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth(api):
    api.post("/api/auth/signup", json={"username": _USERNAME, "email": _EMAIL, "password": _PW})
    r = api.post("/api/auth/login", json={"username_or_email": _EMAIL, "password": _PW})
    assert r.status_code == 200
    body = r.json()
    return body["access_token"], body["user"]["id"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── Create behavior log ───────────────────────────────────────────────────────

def test_create_behavior_log(api, auth):
    tok, uid = auth
    r = api.post(
        f"/api/behaviors/{uid}",
        headers=_headers(tok),
        json={
            "text": "30분 독서",
            "tag": "학습",
            "emotion": "happy",
            "intensity": 7,
        },
    )
    assert r.status_code in (200, 201)
    body = r.json()
    assert body["text"] == "30분 독서"
    assert body["tag"] == "학습"


def test_create_behavior_log_without_auth(api, auth):
    _, uid = auth
    r = api.post(
        f"/api/behaviors/{uid}",
        json={"text": "test", "tag": "test", "emotion": "neutral", "intensity": 5},
    )
    assert r.status_code in (401, 403)


def test_create_behavior_log_missing_fields(api, auth):
    tok, uid = auth
    r = api.post(
        f"/api/behaviors/{uid}",
        headers=_headers(tok),
        json={"tag": "학습"},  # missing text
    )
    assert r.status_code == 422


# ── List behavior logs ────────────────────────────────────────────────────────

def test_list_behavior_logs(api, auth):
    tok, uid = auth
    r = api.get(f"/api/behaviors/{uid}", headers=_headers(tok))
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) >= 1


def test_list_behavior_logs_without_auth(api, auth):
    _, uid = auth
    r = api.get(f"/api/behaviors/{uid}")
    assert r.status_code in (401, 403)


# ── Get single behavior log ───────────────────────────────────────────────────

def test_get_single_behavior_log(api, auth):
    tok, uid = auth
    # List first to get a valid ID
    r = api.get(f"/api/behaviors/{uid}", headers=_headers(tok))
    assert r.status_code == 200
    logs = r.json()
    if not logs:
        pytest.skip("No logs to test single-get")
    log_id = logs[0]["id"]
    r2 = api.get(f"/api/behaviors/{uid}/{log_id}", headers=_headers(tok))
    assert r2.status_code == 200
    assert r2.json()["id"] == log_id


def test_get_nonexistent_log_returns_404(api, auth):
    tok, uid = auth
    r = api.get(f"/api/behaviors/{uid}/99999", headers=_headers(tok))
    assert r.status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────

def test_delete_behavior_log(api, auth):
    tok, uid = auth
    # Create a log to delete
    r = api.post(
        f"/api/behaviors/{uid}",
        headers=_headers(tok),
        json={"text": "삭제할 항목", "tag": "테스트", "emotion": "neutral", "intensity": 3},
    )
    assert r.status_code in (200, 201)
    log_id = r.json()["id"]

    r2 = api.delete(f"/api/behaviors/{uid}/{log_id}", headers=_headers(tok))
    assert r2.status_code in (200, 204)


# ── Dashboard overview ─────────────────────────────────────────────────────────

def test_dashboard_overview(api, auth):
    tok, uid = auth
    r = api.get(f"/api/ui/{uid}/overview", headers=_headers(tok))
    assert r.status_code == 200
    body = r.json()
    assert "stat_cards" in body
    assert "insights" in body
    assert isinstance(body["stat_cards"], list)
