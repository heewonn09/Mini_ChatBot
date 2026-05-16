from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.auth import require_same_user
from backend.database import get_db
from backend.models.behavior import User
from backend.schemas.behavior import (
    BehaviorLogCreate,
    BehaviorLogResponse,
    BehaviorLogUpdate,
)
from backend.services.behavior_service import BehaviorService

router = APIRouter(prefix="/api/behaviors", tags=["Behaviors"])


@router.post("/{user_id}", response_model=BehaviorLogResponse, status_code=201)
def create_behavior_log(
    user_id: int,
    behavior: BehaviorLogCreate,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    svc = BehaviorService(db)
    return svc.create(
        user_id=user_id,
        text=behavior.text,
        emotion=behavior.emotion.value,
        tag=behavior.tag,
        intensity=behavior.intensity,
        created_at=behavior.created_at,
    )


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
