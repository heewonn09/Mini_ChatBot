from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationship
    behavior_logs = relationship("BehaviorLog", back_populates="user", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username})>"


class BehaviorLog(Base):
    __tablename__ = "behavior_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    emotion = Column(String(50), nullable=False)  # happy, sad, angry, neutral, anxious, etc.
    tag = Column(String(100), nullable=True)  # sleep, work, exercise, social, etc.
    intensity = Column(Float, default=5.0)  # 1-10 scale for emotion intensity
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationship
    user = relationship("User", back_populates="behavior_logs")
    
    def __repr__(self):
        return f"<BehaviorLog(id={self.id}, user_id={self.user_id}, emotion={self.emotion})>"
