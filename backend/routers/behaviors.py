from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.behavior import BehaviorLog, User
from backend.schemas.behavior import (
    BehaviorLogCreate,
    BehaviorLogResponse,
    BehaviorLogUpdate,
    BehaviorLogWithUser,
)
from backend.services.webhook_service import WebhookService

router = APIRouter(prefix="/api/behaviors", tags=["Behaviors"])


@router.post("/{user_id}", response_model=BehaviorLogResponse, status_code=201)
def create_behavior_log(
    user_id: int,
    behavior: BehaviorLogCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Create a new behavior log for a user"""
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    payload = behavior.model_dump(exclude={"created_at"})
    db_behavior = BehaviorLog(user_id=user_id, **payload)

    if behavior.created_at is not None:
        db_behavior.created_at = behavior.created_at

    db.add(db_behavior)
    db.commit()
    db.refresh(db_behavior)

    background_tasks.add_task(
        WebhookService.publish_event,
        user_id,
        "behavior.created",
        {
            "behavior_id": db_behavior.id,
            "emotion": db_behavior.emotion,
            "tag": db_behavior.tag,
            "intensity": db_behavior.intensity,
            "created_at": db_behavior.created_at.isoformat(),
        },
    )

    return db_behavior


@router.get("/{user_id}/{log_id}", response_model=BehaviorLogResponse)
def get_behavior_log(user_id: int, log_id: int, db: Session = Depends(get_db)):
    """Get a specific behavior log"""
    behavior = db.query(BehaviorLog).filter(
        (BehaviorLog.id == log_id) & (BehaviorLog.user_id == user_id)
    ).first()
    
    if not behavior:
        raise HTTPException(status_code=404, detail="Behavior log not found")
    return behavior


@router.get("/{user_id}", response_model=list[BehaviorLogResponse])
def list_user_behaviors(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List all behavior logs for a user"""
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if limit > 100:
        limit = 100
        
    behaviors = db.query(BehaviorLog).filter(
        BehaviorLog.user_id == user_id
    ).order_by(BehaviorLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return behaviors


@router.put("/{user_id}/{log_id}", response_model=BehaviorLogResponse)
def update_behavior_log(
    user_id: int,
    log_id: int,
    behavior: BehaviorLogUpdate,
    db: Session = Depends(get_db),
):
    """Update a behavior log"""
    db_behavior = db.query(BehaviorLog).filter(
        (BehaviorLog.id == log_id) & (BehaviorLog.user_id == user_id)
    ).first()
    
    if not db_behavior:
        raise HTTPException(status_code=404, detail="Behavior log not found")
    
    update_data = behavior.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_behavior, key, value)
    
    db.add(db_behavior)
    db.commit()
    db.refresh(db_behavior)

    return db_behavior


@router.delete("/{user_id}/{log_id}", status_code=204)
def delete_behavior_log(user_id: int, log_id: int, db: Session = Depends(get_db)):
    """Delete a behavior log"""
    behavior = db.query(BehaviorLog).filter(
        (BehaviorLog.id == log_id) & (BehaviorLog.user_id == user_id)
    ).first()
    
    if not behavior:
        raise HTTPException(status_code=404, detail="Behavior log not found")
    
    db.delete(behavior)
    db.commit()
    return None
