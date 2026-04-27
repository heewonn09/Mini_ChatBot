from datetime import datetime, timedelta, timezone
import logging
import os

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.behavior import User

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12

# Keep bcrypt in the list to verify legacy hashes, but generate new hashes with pbkdf2_sha256.
# This avoids passlib+bcrypt runtime incompatibilities observed with newer bcrypt builds.
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except Exception as exc:  # pragma: no cover - defensive guard for env-specific crypto issues
        logger.exception("Password hashing failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Password hashing failed") from exc


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except Exception:
        # Any hash verification backend issue should not crash auth routes.
        return False


def create_access_token(subject: str, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        user_id = int(subject)
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    return user


def require_same_user(user_id: int, current_user: User = Depends(get_current_user)) -> User:
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden for this user")
    return current_user
