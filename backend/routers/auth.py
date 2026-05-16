from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from backend.auth import ALGORITHM, create_access_token, create_refresh_token, get_current_user
from backend.config import get_settings
from backend.database import get_db
from backend.models.behavior import User
from backend.redis_client import redis_store
from backend.schemas.behavior import RefreshRequest, RefreshResponse, TokenResponse, UserCreate, UserLogin
from backend.services.user_service import UserService

router = APIRouter(prefix="/api/auth", tags=["Auth"])


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
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    _enforce_rate_limit(request)
    user = UserService(db).get_by_credentials(payload.username_or_email, payload.password)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=user,
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