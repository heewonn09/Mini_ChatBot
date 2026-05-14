from sqlalchemy import or_
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
            existing = self.db.query(User).filter(
                (User.email == email) | (User.username == username)
            ).first()
        except SQLAlchemyError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="User with this email or username already exists",
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
        try:
            user = self.db.query(User).filter(
                or_(User.email == login_id, User.username == login_id)
            ).first()
        except SQLAlchemyError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        return user
