import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status

logger = logging.getLogger(__name__)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from backend.auth import ALGORITHM, create_access_token, create_refresh_token, get_current_user, hash_password
from backend.config import get_settings
from backend.database import get_db
from backend.models.behavior import User
from backend.redis_client import redis_store
from backend.schemas.behavior import RefreshRequest, RefreshResponse, TokenResponse, UserCreate, UserLogin
from backend.services.email_service import send_password_reset_email
from backend.services.user_service import UserService

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
    user = UserService(db).register(payload.username, payload.email, payload.password)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=user,
        is_new_user=True,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    _enforce_rate_limit(request)
    user = UserService(db).get_by_credentials(payload.username_or_email, payload.password)
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
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return RefreshResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


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
            if jti and exp:
                ttl = max(int(exp - _time.time()), 0)
                redis_store.blacklist_token(jti, ttl or 3600)
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