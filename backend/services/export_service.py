import csv
import io
import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.models.behavior import BehaviorLog
from backend.models.chat import ChatHistory, ChatSession


class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def export_behaviors_csv(self, user_id: int) -> str:
        logs = (
            self.db.query(BehaviorLog)
            .filter(BehaviorLog.user_id == user_id)
            .order_by(BehaviorLog.created_at.desc())
            .all()
        )
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["id", "text", "emotion", "tag", "intensity", "notes", "created_at"])
        for log in logs:
            writer.writerow([
                log.id,
                log.text,
                log.emotion,
                log.tag or "",
                log.intensity,
                getattr(log, "notes", "") or "",
                log.created_at.isoformat() if log.created_at else "",
            ])
        return buf.getvalue()

    def export_behaviors_json(self, user_id: int) -> list[dict]:
        logs = (
            self.db.query(BehaviorLog)
            .filter(BehaviorLog.user_id == user_id)
            .order_by(BehaviorLog.created_at.desc())
            .all()
        )
        return [
            {
                "id": log.id,
                "text": log.text,
                "emotion": log.emotion,
                "tag": log.tag,
                "intensity": log.intensity,
                "notes": getattr(log, "notes", None),
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]

    def export_chat_markdown(self, user_id: int, session_id: int) -> str:
        session = (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )
        if not session:
            return ""
        messages = (
            self.db.query(ChatHistory)
            .filter(ChatHistory.session_id == session_id)
            .order_by(ChatHistory.created_at.asc())
            .all()
        )
        lines = [f"# {session.title}", f"_내보낸 날짜: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}_", ""]
        for msg in messages:
            role_label = "**나**" if msg.role == "user" else "**Mindflow AI**"
            ts = msg.created_at.strftime("%H:%M") if msg.created_at else ""
            lines.append(f"{role_label} ({ts})")
            lines.append(msg.message)
            lines.append("")
        return "\n".join(lines)
