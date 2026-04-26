from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.behavior import EventLog, WebhookSubscription


class WebhookService:
    MAX_RETRIES = 3
    TIMEOUT_SECONDS = 10

    @staticmethod
    async def send_webhook(url: str, payload: dict[str, Any]) -> tuple[bool, int | None, str | None]:
        try:
            async with httpx.AsyncClient(timeout=WebhookService.TIMEOUT_SECONDS) as client:
                response = await client.post(url, json=payload)
                return response.is_success, response.status_code, None
        except Exception as exc:
            return False, None, str(exc)

    @staticmethod
    async def publish_event(user_id: int, event_type: str, payload: dict[str, Any]) -> None:
        db = SessionLocal()
        try:
            subscriptions = db.query(WebhookSubscription).filter(
                (WebhookSubscription.user_id == user_id)
                & (WebhookSubscription.is_active.is_(True))
                & (WebhookSubscription.event_type == event_type)
            ).all()

            event_payload = {
                "event_type": event_type,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "payload": payload,
            }

            for subscription in subscriptions:
                await WebhookService._send_with_retries(db, subscription, event_payload)
        finally:
            db.close()

    @staticmethod
    async def _send_with_retries(db: Session, subscription: WebhookSubscription, payload: dict[str, Any]) -> None:
        for retry_count in range(WebhookService.MAX_RETRIES):
            success, status_code, error = await WebhookService.send_webhook(subscription.url, payload)
            status = "success" if success else "failed"
            db.add(
                EventLog(
                    user_id=subscription.user_id,
                    webhook_subscription_id=subscription.id,
                    event_type=subscription.event_type,
                    payload=payload,
                    status=status,
                    retry_count=retry_count,
                    response_code=status_code,
                    error_message=error,
                )
            )
            db.commit()

            if success:
                return

            if retry_count < WebhookService.MAX_RETRIES - 1:
                await asyncio.sleep(0.5 * (retry_count + 1))
