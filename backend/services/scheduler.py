import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.database import SessionLocal
from backend.models.community import Challenge, ChallengeParticipant
from backend.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


def _complete_finished_challenges() -> None:
    """Mark challenge participants as completed when completed_days >= duration_days."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        rows = (
            db.query(ChallengeParticipant, Challenge)
            .join(Challenge, ChallengeParticipant.challenge_id == Challenge.id)
            .filter(
                ChallengeParticipant.is_completed == False,  # noqa: E712
                ChallengeParticipant.completed_days >= Challenge.duration_days,
            )
            .all()
        )
        count = 0
        for participant, challenge in rows:
            participant.is_completed = True
            participant.completed_at = now
            try:
                NotificationService(db).create(
                    user_id=participant.user_id,
                    type="achievement",
                    title="🏆 챌린지 완료!",
                    body=f"'{challenge.title}' 챌린지를 완주했어요! 대단해요!",
                )
            except Exception as e:
                logger.warning("notification_create_failed user=%s error=%s", participant.user_id, e)
            count += 1
        if count:
            db.commit()
            logger.info("challenge_auto_complete count=%d", count)
    except Exception as e:
        logger.error("challenge_auto_complete_failed error=%s", e, exc_info=True)
        db.rollback()
    finally:
        db.close()


def _reset_broken_streaks() -> None:
    """Reset streak to 0 for participants who missed yesterday's check-in."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        today_ordinal = now.date().toordinal()
        rows = (
            db.query(ChallengeParticipant)
            .filter(
                ChallengeParticipant.current_streak > 0,
                ChallengeParticipant.is_completed == False,  # noqa: E712
                ChallengeParticipant.last_checked_in != None,  # noqa: E711
            )
            .all()
        )
        count = 0
        for p in rows:
            last = p.last_checked_in.date().toordinal()
            if today_ordinal - last > 1:
                p.current_streak = 0
                count += 1
        if count:
            db.commit()
            logger.info("streak_reset count=%d", count)
    except Exception as e:
        logger.error("streak_reset_failed error=%s", e, exc_info=True)
        db.rollback()
    finally:
        db.close()


def start_scheduler() -> None:
    scheduler.add_job(
        _complete_finished_challenges,
        CronTrigger(hour=2, minute=0),
        id="complete_challenges",
        replace_existing=True,
    )
    scheduler.add_job(
        _reset_broken_streaks,
        CronTrigger(hour=2, minute=5),
        id="reset_streaks",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
