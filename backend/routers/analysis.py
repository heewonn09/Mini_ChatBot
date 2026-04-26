from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import SessionLocal, get_db
from backend.models.behavior import AnalysisResult, RiskEvent, User
from backend.schemas.behavior import PatternAnalysisRequest, PatternAnalysisResult
from backend.services.ai_feedback_service import AIFeedbackService
from backend.services.analysis_result_service import AnalysisResultService
from backend.services.pattern_analysis_service import PatternAnalysisService
from backend.services.webhook_service import WebhookService

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

ai_service = AIFeedbackService()


@router.post("/{user_id}", response_model=PatternAnalysisResult)
def analyze_user_patterns(
    user_id: int,
    request: PatternAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cached = AnalysisResultService.get_latest_valid(user_id=user_id, days=request.days, db=db)
    if cached:
        return AnalysisResultService.to_schema(cached)

    analysis_started_at = datetime.utcnow()
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=request.days, db=db)
    analysis.ai_feedback = "Feedback generation in progress"
    saved = AnalysisResultService.save_result(result=analysis, db=db)

    background_tasks.add_task(_generate_feedback_task, saved.id)

    risk_events = db.query(RiskEvent).filter(
        (RiskEvent.user_id == user_id) & (RiskEvent.created_at >= analysis_started_at)
    ).all()
    for event in risk_events:
        background_tasks.add_task(
            WebhookService.publish_event,
            user_id,
            "risk.detected",
            {
                "risk_event_id": event.id,
                "risk_type": event.event_type,
                "severity": event.severity,
                "details": event.details,
                "created_at": event.created_at.isoformat(),
            },
        )
    background_tasks.add_task(
        WebhookService.publish_event,
        user_id,
        "analysis.completed",
        {
            "analysis_result_id": saved.id,
            "analysis_period_days": saved.analysis_period_days,
            "total_logs": saved.total_logs,
            "generated_at": saved.created_at.isoformat(),
        },
    )

    return AnalysisResultService.to_schema(saved)


def _generate_feedback_task(analysis_result_id: int) -> None:
    db = SessionLocal()
    try:
        analysis_row = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_result_id).first()
        if not analysis_row:
            return
        analysis_schema = AnalysisResultService.to_schema(analysis_row)
        feedback = ai_service.generate_feedback(analysis_schema)
        AnalysisResultService.update_feedback(analysis_result_id, feedback, db)
    finally:
        db.close()
