from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from backend.models.behavior import AnalysisResult, BehaviorLog
from backend.schemas.behavior import PatternAnalysisResult


class AnalysisResultService:
    @staticmethod
    def get_latest_valid(user_id: int, days: int, db: Session) -> AnalysisResult | None:
        latest = db.query(AnalysisResult).filter(
            (AnalysisResult.user_id == user_id)
            & (AnalysisResult.analysis_period_days == days)
        ).order_by(AnalysisResult.created_at.desc()).first()

        if not latest:
            return None

        latest_log = db.query(BehaviorLog).filter(BehaviorLog.user_id == user_id).order_by(BehaviorLog.created_at.desc()).first()
        if latest_log and latest.updated_at < latest_log.created_at:
            return None

        return latest

    @staticmethod
    def save_result(result: PatternAnalysisResult, db: Session) -> AnalysisResult:
        row = AnalysisResult(
            user_id=result.user_id,
            analysis_period_days=result.analysis_period_days,
            total_logs=result.total_logs,
            behavior_patterns=[item.model_dump() for item in result.behavior_patterns],
            emotional_trends=[item.model_dump() for item in result.emotional_trends],
            risky_patterns=[item.model_dump() for item in result.risky_patterns],
            ai_feedback=result.ai_feedback,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def to_schema(row: AnalysisResult) -> PatternAnalysisResult:
        return PatternAnalysisResult(
            user_id=row.user_id,
            analysis_period_days=row.analysis_period_days,
            total_logs=row.total_logs,
            behavior_patterns=row.behavior_patterns,
            emotional_trends=row.emotional_trends,
            risky_patterns=row.risky_patterns,
            ai_feedback=row.ai_feedback,
            generated_at=row.created_at,
        )

    @staticmethod
    def update_feedback(result_id: int, feedback: str, db: Session) -> None:
        row = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
        if not row:
            return
        row.ai_feedback = feedback
        row.updated_at = datetime.utcnow()
        db.add(row)
        db.commit()
