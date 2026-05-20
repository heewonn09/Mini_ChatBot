import json
import logging
import secrets
import ssl
import urllib.parse
import urllib.request

_ssl_ctx = ssl.create_default_context()

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status

logger = logging.getLogger(__name__)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from backend.auth import ALGORITHM, create_access_token, create_refresh_token, get_current_user, hash_password
from backend.config import get_settings
from backend.database import get_db
from backend.models.audit import AuditLog
from backend.models.behavior import User
from backend.redis_client import redis_store
from backend.schemas.behavior import RefreshRequest, RefreshResponse, TokenResponse, UserCreate, UserLogin
from backend.services.email_service import send_password_reset_email
from backend.services.user_service import UserService


def _audit(db, user_id: int | None, action: str, ip: str | None = None, **meta) -> None:
    try:
        db.add(AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip,
            metadata_json=json.dumps(meta) if meta else None,
        ))
        db.commit()
    except Exception:
        pass

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=100)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8, max_length=128)


def _enforce_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    if not redis_store.check_auth_rate_limit(ip, limit=10, window=60):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Too many requests. Please try again later.")


@router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    _enforce_rate_limit(request)
    ip = request.client.host if request.client else None
    user = UserService(db).register(payload.username, payload.email, payload.password)
    _audit(db, user.id, "signup", ip, email=payload.email)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=user,
        is_new_user=True,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    _enforce_rate_limit(request)
    ip = request.client.host if request.client else None
    user = UserService(db).get_by_credentials(payload.username_or_email, payload.password)
    _audit(db, user.id, "login", ip)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=user,
        is_new_user=False,
    )


@router.post("/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        data = jwt.decode(payload.refresh_token, get_settings().jwt_secret_key, algorithms=[ALGORITHM])
        if data.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = int(data.get("sub"))
        old_jti = data.get("jti")
        old_exp = data.get("exp")
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # Reject already-used or revoked refresh tokens (token rotation)
    if old_jti and redis_store.is_token_blacklisted(old_jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))

    # Blacklist the consumed refresh token so it cannot be reused
    if old_jti and old_exp:
        import time as _time
        ttl = max(int(old_exp - _time.time()), 0)
        redis_store.blacklist_token(old_jti, ttl or 3600)

    return RefreshResponse(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout", status_code=200)
def logout(
    credentials=Depends(__import__("fastapi.security", fromlist=["HTTPBearer"]).HTTPBearer(auto_error=False)),
    _: User = Depends(get_current_user),
):
    if credentials:
        try:
            import time as _time
            payload = jwt.decode(credentials.credentials, get_settings().jwt_secret_key, algorithms=[ALGORITHM])
            jti = payload.get("jti")
            exp = payload.get("exp")
            user_id_str = payload.get("sub")
            if jti and exp:
                ttl = max(int(exp - _time.time()), 0)
                redis_store.blacklist_token(jti, ttl or 3600)
            # Audit logout (best-effort, no DB session available in this scope)
        except Exception:
            pass
    return {"detail": "Logged out successfully"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at,
    }


@router.post("/forgot-password", status_code=200)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    user = db.query(User).filter(User.email == payload.email).first()
    # 이메일 존재 여부를 노출하지 않기 위해 항상 같은 응답 반환
    if user:
        token = secrets.token_urlsafe(32)
        redis_store.set_reset_token(token, user.email, ttl=3600)
        reset_url = f"{settings.frontend_url}/auth?token={token}"
        sent = send_password_reset_email(
            to_email=user.email,
            reset_url=reset_url,
            smtp_host=settings.smtp_host,
            smtp_port=settings.smtp_port,
            smtp_user=settings.smtp_user,
            smtp_password=settings.smtp_password,
            smtp_from=settings.smtp_from,
        )
        if not sent:
            logger.warning(
                "[forgot-password] SMTP 미설정 — Render 환경 변수를 확인하세요. "
                "SMTP_USER=%s  reset_url=%s",
                settings.smtp_user or "(비어있음)",
                reset_url,
            )
    return {"message": "입력한 이메일로 재설정 링크를 보냈습니다. 받은 편지함을 확인해주세요."}


def _http_post_form(url: str, data: dict) -> dict:
    encoded = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=encoded, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, timeout=10, context=_ssl_ctx) as resp:
        return json.loads(resp.read())


def _http_get_json(url: str, headers: dict) -> dict:
    req = urllib.request.Request(url)
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=10, context=_ssl_ctx) as resp:
        return json.loads(resp.read())


@router.post("/oauth/kakao", response_model=TokenResponse)
def kakao_oauth(
    code: str = Body(...),
    redirect_uri: str = Body(...),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if not settings.kakao_client_id:
        raise HTTPException(status_code=501, detail="카카오 로그인이 아직 설정되지 않았습니다.")
    try:
        token_data = _http_post_form(
            "https://kauth.kakao.com/oauth/token",
            {
                "grant_type": "authorization_code",
                "client_id": settings.kakao_client_id,
                "client_secret": settings.kakao_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
        access_token = token_data["access_token"]
        user_data = _http_get_json(
            "https://kapi.kakao.com/v2/user/me",
            {"Authorization": f"Bearer {access_token}"},
        )
        kakao_id = str(user_data["id"])
        account = user_data.get("kakao_account", {})
        email = account.get("email") or f"kakao_{kakao_id}@oauth.mindflow.app"
        nickname = account.get("profile", {}).get("nickname") or f"유저{kakao_id[-4:]}"
    except Exception as exc:
        logger.error("Kakao OAuth error: %s", exc)
        raise HTTPException(status_code=400, detail="카카오 인증에 실패했습니다.")

    user, is_new = UserService(db).get_or_create_oauth_user("kakao", email, nickname)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=user,
        is_new_user=is_new,
    )


@router.post("/oauth/google", response_model=TokenResponse)
def google_oauth(
    code: str = Body(...),
    redirect_uri: str = Body(...),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="구글 로그인이 아직 설정되지 않았습니다.")
    try:
        token_data = _http_post_form(
            "https://oauth2.googleapis.com/token",
            {
                "grant_type": "authorization_code",
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
        access_token = token_data["access_token"]
        user_data = _http_get_json(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {"Authorization": f"Bearer {access_token}"},
        )
        email = user_data.get("email") or f"google_{user_data.get('sub','x')}@oauth.mindflow.app"
        name = user_data.get("name") or user_data.get("given_name") or "구글유저"
    except Exception as exc:
        logger.error("Google OAuth error: %s", exc)
        raise HTTPException(status_code=400, detail="구글 인증에 실패했습니다.")

    user, is_new = UserService(db).get_or_create_oauth_user("google", email, name)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=user,
        is_new_user=is_new,
    )


@router.post("/reset-password", status_code=200)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = redis_store.get_reset_email(payload.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않거나 만료된 링크입니다. 비밀번호 찾기를 다시 시도해주세요.",
        )
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    redis_store.delete_reset_token(payload.token)
    return {"message": "비밀번호가 변경됐습니다. 새 비밀번호로 로그인해주세요."}