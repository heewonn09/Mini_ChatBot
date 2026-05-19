import secrets

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.auth import hash_password, verify_password
from backend.models.behavior import User


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, username: str, email: str, password: str) -> User:
        try:
            existing = self.db.query(User).filter(User.email == email).first()
        except SQLAlchemyError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="이미 사용 중인 이메일입니다.",
            )
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_credentials(self, login_id: str, password: str) -> User:
        # username은 중복 허용 → 이메일로만 로그인
        try:
            user = self.db.query(User).filter(User.email == login_id).first()
        except SQLAlchemyError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            )
        return user

    def get_or_create_oauth_user(self, provider: str, email: str, username: str) -> tuple:
        user = self.db.query(User).filter(User.email == email).first()
        if user:
            return user, False
        user = User(
            username=username,
            email=email,
            password_hash=f"oauth:{provider}:{secrets.token_urlsafe(16)}",
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user, True
