"""Unit tests for UserService — uses in-memory SQLite via conftest."""
import pytest
from fastapi import HTTPException

from backend.services.user_service import UserService


def test_register_new_user(db):
    svc = UserService(db)
    user = svc.register("svc_user1", "svc1@test.com", "Pass1234!")
    assert user.id is not None
    assert user.email == "svc1@test.com"
    assert user.username == "svc_user1"
    assert user.password_hash != "Pass1234!"  # hashed


def test_register_duplicate_email_raises(db):
    svc = UserService(db)
    svc.register("dup_user", "dup@test.com", "Pass1234!")
    with pytest.raises(HTTPException) as exc_info:
        svc.register("dup_user2", "dup@test.com", "Pass1234!")
    assert exc_info.value.status_code == 400


def test_get_by_credentials_success(db):
    svc = UserService(db)
    svc.register("cred_user", "cred@test.com", "Secure999!")
    user = svc.get_by_credentials("cred@test.com", "Secure999!")
    assert user.email == "cred@test.com"


def test_get_by_credentials_wrong_password(db):
    svc = UserService(db)
    svc.register("wrong_pw_user", "wrong_pw@test.com", "RightPass1!")
    with pytest.raises(HTTPException) as exc_info:
        svc.get_by_credentials("wrong_pw@test.com", "WrongPass!")
    assert exc_info.value.status_code == 401


def test_get_by_credentials_nonexistent_email(db):
    svc = UserService(db)
    with pytest.raises(HTTPException) as exc_info:
        svc.get_by_credentials("nobody@test.com", "anything")
    assert exc_info.value.status_code == 401


def test_get_or_create_oauth_user_new(db):
    svc = UserService(db)
    user, is_new = svc.get_or_create_oauth_user("google", "oauth_new@test.com", "OAuth유저")
    assert is_new is True
    assert user.email == "oauth_new@test.com"
    assert user.password_hash.startswith("oauth:google:")


def test_get_or_create_oauth_user_existing(db):
    svc = UserService(db)
    svc.register("existing_oauth", "oauth_exist@test.com", "Pass123!")
    user, is_new = svc.get_or_create_oauth_user("kakao", "oauth_exist@test.com", "Kakao유저")
    assert is_new is False
    assert user.email == "oauth_exist@test.com"
