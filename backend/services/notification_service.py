from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models.notification import Notification


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, type: str, title: str, body: Optional[str] = None) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def list_unread(self, user_id: int) -> list[Notification]:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
            .order_by(Notification.created_at.desc())
            .all()
        )

    def list_all(self, user_id: int, limit: int = 30) -> list[Notification]:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )

    def mark_read(self, user_id: int, notif_id: int) -> Notification:
        notif = self.db.query(Notification).filter(
            Notification.id == notif_id,
            Notification.user_id == user_id,
        ).first()
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def mark_all_read(self, user_id: int) -> None:
        self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,  # noqa: E712
        ).update({"is_read": True, "read_at": datetime.now(timezone.utc)})
        self.db.commit()
