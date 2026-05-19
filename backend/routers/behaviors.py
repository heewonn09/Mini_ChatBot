from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from backend.auth import require_same_user
from backend.database import get_db
from backend.models.behavior import BehaviorLog, User
from backend.models.behavior_tag import BehaviorTag
from backend.models.notification import Notification
from backend.redis_client import redis_store
from backend.schemas.behavior import (
    BehaviorLogCreate,
    BehaviorLogResponse,
    BehaviorLogUpdate,
)
from backend.services.behavior_service import BehaviorService
from backend.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/behaviors", tags=["Behaviors"])

_BEHAVIOR_RATE_LIMIT = 60
_BEHAVIOR_RATE_WINDOW = 3600  # per hour


def _enforce_behavior_rate_limit(request: Request, user_id: int) -> None:
    key = f"rate:behavior:{user_id}"
    count = redis_store.incr_with_ttl(key, _BEHAVIOR_RATE_WINDOW)
    if count > _BEHAVIOR_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="행동 기록 요청이 너무 많습니다. 1시간 후 다시 시도해주세요.",
        )

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


def _upsert_behavior_tag(db: Session, tag: str | None) -> None:
    """Maintain global BehaviorTag registry and increment usage count."""
    if not tag:
        return
    normalized = tag.strip().lower()
    if not normalized:
        return
    try:
        existing = db.query(BehaviorTag).filter(BehaviorTag.name == normalized).first()
        if existing:
            existing.usage_count = (existing.usage_count or 0) + 1
        else:
            db.add(BehaviorTag(name=normalized, usage_count=1))
        db.commit()
    except Exception:
        pass


@router.get("/{user_id}/tags")
def list_user_tags(
    user_id: int,
    limit: int = Query(default=20, ge=1, le=50),
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    """Returns this user's most-used tags from their behavior log history."""
    from collections import Counter
    logs = db.query(BehaviorLog.tag).filter(
        BehaviorLog.user_id == user_id,
        BehaviorLog.tag.isnot(None),
        BehaviorLog.is_deleted == False,  # noqa: E712
    ).all()
    counter = Counter(row.tag for row in logs if row.tag)
    tags = [{"tag": tag, "count": count} for tag, count in counter.most_common(limit)]
    return {"tags": tags}


@router.post("/{user_id}", response_model=BehaviorLogResponse, status_code=201)
def create_behavior_log(
    user_id: int,
    behavior: BehaviorLogCreate,
    request: Request,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _enforce_behavior_rate_limit(request, user_id)
    svc = BehaviorService(db)
    log = svc.create(
        user_id=user_id,
        text=behavior.text,
        emotion=behavior.emotion.value,
        tag=behavior.tag,
        intensity=behavior.intensity,
        created_at=behavior.created_at,
    )
    _upsert_behavior_tag(db, behavior.tag)
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
