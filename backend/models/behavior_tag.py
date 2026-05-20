from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from backend.models.base import Base


class BehaviorTag(Base):
    __tablename__ = "behavior_tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)   # lowercase, trimmed
    category = Column(String(50), nullable=True)              # sleep/work/exercise/social
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
