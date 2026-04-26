from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.behavior import User, WebhookSubscription
from backend.schemas.behavior import WebhookSubscriptionCreate, WebhookSubscriptionResponse

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.post("", response_model=WebhookSubscriptionResponse, status_code=201)
def create_webhook_subscription(
    payload: WebhookSubscriptionCreate,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    subscription = WebhookSubscription(user_id=user_id, **payload.model_dump())
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.get("", response_model=list[WebhookSubscriptionResponse])
def list_webhook_subscriptions(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    return db.query(WebhookSubscription).filter(WebhookSubscription.user_id == user_id).order_by(WebhookSubscription.id.desc()).all()


@router.delete("/{subscription_id}", status_code=204)
def delete_webhook_subscription(
    subscription_id: int,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    subscription = db.query(WebhookSubscription).filter(
        (WebhookSubscription.id == subscription_id)
        & (WebhookSubscription.user_id == user_id)
    ).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")

    db.delete(subscription)
    db.commit()
    return None
