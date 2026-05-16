from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models.behavior import BehaviorLog
from backend.redis_client import redis_store


class BehaviorService:
    def __init__(self, db: Session):
        self.db = db

    def _invalidate_cache(self, user_id: int) -> None:
        redis_store.delete(f"ui:overview:{user_id}")

    def create(self, user_id: int, text: str, emotion: str, tag: Optional[str],
               intensity: float, created_at: Optional[datetime] = None, notes: Optional[str] = None) -> BehaviorLog:
        normalized_tag = tag.strip().lower() if tag and tag.strip() else None
        log = BehaviorLog(
            user_id=user_id,
            text=text,
            emotion=emotion,
            tag=normalized_tag,
            intensity=intensity,
            created_at=created_at or datetime.now(timezone.utc),
        )
        if hasattr(BehaviorLog, "notes") and notes:
            log.notes = notes
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        self._invalidate_cache(user_id)
        return log

    def get(self, user_id: int, log_id: int) -> BehaviorLog:
        log = self.db.query(BehaviorLog).filter(
            BehaviorLog.id == log_id,
            BehaviorLog.user_id == user_id,
        ).first()
        if not log:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Behavior log not found")
        return log

    def list(self, user_id: int, limit: int = 50, skip: int = 0,
             emotion: Optional[str] = None, tag: Optional[str] = None) -> list[BehaviorLog]:
        q = self.db.query(BehaviorLog).filter(BehaviorLog.user_id == user_id)
        if emotion:
            q = q.filter(BehaviorLog.emotion == emotion)
        if tag:
            q = q.filter(BehaviorLog.tag == tag.strip().lower())
        return q.order_by(BehaviorLog.created_at.desc()).offset(skip).limit(min(limit, 100)).all()

    def update(self, user_id: int, log_id: int, **fields) -> BehaviorLog:
        log = self.get(user_id, log_id)
        for key, val in fields.items():
            if val is None:
                continue
            if key == "tag":
                val = val.strip().lower() if val and val.strip() else None
            setattr(log, key, val)
        self.db.commit()
        self.db.refresh(log)
        self._invalidate_cache(user_id)
        return log

    def delete(self, user_id: int, log_id: int) -> None:
        log = self.get(user_id, log_id)
        self.db.delete(log)
        self.db.commit()
        self._invalidate_cache(user_id)
