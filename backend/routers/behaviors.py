from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.auth import require_same_user
from backend.database import get_db
from backend.models.behavior import BehaviorLog, User
from backend.models.notification import Notification
from backend.schemas.behavior import (
    BehaviorLogCreate,
    BehaviorLogResponse,
    BehaviorLogUpdate,
)
from backend.services.behavior_service import BehaviorService
from backend.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/behaviors", tags=["Behaviors"])

_ACHIEVEMENT_MILESTONES = [
    ("streak_7",  "achievement", "🎉 첫 번째 주 달성!", "7일 연속 행동 기록을 달성했어요. 잘하고 있어요!"),
    ("streak_30", "achievement", "👑 꾸준함의 왕 달성!", "30일 연속 기록! 정말 대단해요!"),
    ("logs_50",   "achievement", "🧠 자기 인식 달성!", "행동 기록 50개를 달성했어요. 대단한 성찰이에요!"),
]

def _maybe_notify_achievements(db: Session, user_id: int) -> None:
    logs = db.query(BehaviorLog).filter(BehaviorLog.user_id == user_id).all()
    streak = DashboardService.current_streak(logs)
    total = len(logs)

    checks = {
        "streak_7":  streak >= 7,
        "streak_30": streak >= 30,
        "logs_50":   total >= 50,
    }
    for key, notif_type, title, body in _ACHIEVEMENT_MILESTONES:
        if not checks[key]:
            continue
        exists = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.title == title,
        ).first()
        if not exists:
            db.add(Notification(user_id=user_id, type=notif_type, title=title, body=body))
    db.commit()


@router.post("/{user_id}", response_model=BehaviorLogResponse, status_code=201)
def create_behavior_log(
    user_id: int,
    behavior: BehaviorLogCreate,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    svc = BehaviorService(db)
    log = svc.create(
        user_id=user_id,
        text=behavior.text,
        emotion=behavior.emotion.value,
        tag=behavior.tag,
        intensity=behavior.intensity,
        created_at=behavior.created_at,
    )
    try:
        _maybe_notify_achievements(db, user_id)
    except Exception:
        pass
    return log


@router.get("/{user_id}/{log_id}", response_model=BehaviorLogResponse)
def get_behavior_log(
    user_id: int,
    log_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    return BehaviorService(db).get(user_id, log_id)


@router.get("/{user_id}", response_model=list[BehaviorLogResponse])
def list_user_behaviors(
    user_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    emotion: str = Query(default=None),
    tag: str = Query(default=None),
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    return BehaviorService(db).list(user_id, limit=limit, skip=skip, emotion=emotion, tag=tag)


@router.put("/{user_id}/{log_id}", response_model=BehaviorLogResponse)
def update_behavior_log(
    user_id: int,
    log_id: int,
    behavior: BehaviorLogUpdate,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    fields = behavior.model_dump(exclude_unset=True)
    if "emotion" in fields and fields["emotion"] is not None:
        fields["emotion"] = fields["emotion"].value
    return BehaviorService(db).update(user_id, log_id, **fields)


@router.delete("/{user_id}/{log_id}", status_code=204)
def delete_behavior_log(
    user_id: int,
    log_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    BehaviorService(db).delete(user_id, log_id)
