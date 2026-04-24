from collections import Counter, defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.behavior import BehaviorLog, User
from backend.schemas.ui import (
    ChatRequest,
    ChatResponse,
    EmotionTrendPoint,
    HabitFrequencyItem,
    InsightItem,
    OverviewResponse,
    RecentActivityItem,
    StatCard,
    TimelinePoint,
)
from backend.services.ai_feedback_service import AIFeedbackService
from backend.services.pattern_analysis_service import PatternAnalysisService

router = APIRouter(prefix="/api/ui", tags=["UI"])
ai_service = AIFeedbackService()

NEGATIVE_EMOTIONS = {"sad", "angry", "anxious", "stressed", "depressed"}
POSITIVE_EMOTIONS = {"happy", "focused", "calm", "motivated", "neutral"}


@router.get("/{user_id}/overview", response_model=OverviewResponse)
def get_overview(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    since = datetime.utcnow() - timedelta(days=7)
    logs = (
        db.query(BehaviorLog)
        .filter((BehaviorLog.user_id == user_id) & (BehaviorLog.created_at >= since))
        .order_by(BehaviorLog.created_at.asc())
        .all()
    )

    if not logs:
        return OverviewResponse(
            welcome_name=user.username,
            stat_cards=[
                StatCard(title="Most Frequent Behavior", value="No logs yet", subtitle="Start logging to see patterns", trend="neutral"),
                StatCard(title="Worst Habit Time", value="-", subtitle="Need more data", trend="neutral"),
                StatCard(title="Best Focus Time", value="-", subtitle="Need more data", trend="neutral"),
                StatCard(title="Weekly Progress", value="0%", subtitle="Add at least one behavior", trend="neutral"),
            ],
            daily_timeline=[],
            emotion_trends=[],
            habit_frequency=[],
            insights=[InsightItem(title="No data yet", description="Log your first behavior to unlock AI insights.", type="info")],
            recent_activity=[],
        )

    tag_counter = Counter([log.tag or "Other" for log in logs])
    most_tag, most_count = tag_counter.most_common(1)[0]

    hour_groups = defaultdict(list)
    for log in logs:
        hour_groups[log.created_at.hour].append(log)

    worst_hour = max(hour_groups.items(), key=lambda x: sum(_is_negative(item) for item in x[1]) / len(x[1]))[0]
    best_hour = max(hour_groups.items(), key=lambda x: sum(_is_positive(item) for item in x[1]) / len(x[1]))[0]

    timeline = _build_timeline(logs)
    trends = _build_weekday_trends(logs)
    habits = [HabitFrequencyItem(tag=tag, count=count) for tag, count in tag_counter.most_common(6)]

    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)
    insights = [
        InsightItem(
            title=f"Top emotion: {analysis.behavior_patterns[0].emotion}" if analysis.behavior_patterns else "Keep tracking",
            description=f"{analysis.total_logs} logs analyzed in the last 7 days.",
            type="info",
        )
    ]
    for risk in analysis.risky_patterns[:3]:
        insights.append(
            InsightItem(title=risk.pattern.replace("_", " ").title(), description=risk.description, type="warning")
        )
    if len(insights) < 3:
        insights.append(
            InsightItem(
                title="Strong consistency",
                description="You are steadily recording your behavior, great progress.",
                type="success",
            )
        )

    recent = [
        RecentActivityItem(
            id=log.id,
            text=log.text,
            tag=log.tag,
            emotion=log.emotion,
            created_at=log.created_at,
        )
        for log in sorted(logs, key=lambda x: x.created_at, reverse=True)[:6]
    ]

    return OverviewResponse(
        welcome_name=user.username,
        stat_cards=[
            StatCard(title="Most Frequent Behavior", value=most_tag, subtitle=f"{most_count} times this week", trend="up"),
            StatCard(title="Worst Habit Time", value=_hour_range(worst_hour), subtitle="Higher distraction tendency", trend="down"),
            StatCard(title="Best Focus Time", value=_hour_range(best_hour), subtitle="Highest productivity tendency", trend="up"),
            StatCard(title="Weekly Progress", value=f"+{min(100, int((len(logs) / 21) * 100))}%", subtitle="Compared with target pace", trend="up"),
        ],
        daily_timeline=timeline,
        emotion_trends=trends,
        habit_frequency=habits,
        insights=insights,
        recent_activity=recent,
    )


@router.post("/{user_id}/chat", response_model=ChatResponse)
def chat_with_assistant(user_id: int, payload: ChatRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=14, db=db)
    summary = ai_service.generate_feedback(analysis)

    answer = (
        f"질문: {payload.message}\n\n"
        f"{user.username}님의 최근 데이터 기반 인사이트입니다:\n\n{summary}"
    )
    return ChatResponse(answer=answer)


def _is_negative(log: BehaviorLog) -> int:
    return int(log.emotion.lower() in NEGATIVE_EMOTIONS)


def _is_positive(log: BehaviorLog) -> int:
    return int(log.emotion.lower() in POSITIVE_EMOTIONS)


def _hour_range(hour: int) -> str:
    start = hour % 24
    end = (hour + 3) % 24
    return f"{start:02d}:00 - {end:02d}:00"


def _build_timeline(logs: list[BehaviorLog]) -> list[TimelinePoint]:
    bins = [6, 9, 12, 15, 18, 21, 0]
    grouped = defaultdict(list)
    for log in logs:
        for b in bins:
            if b == 0 and (log.created_at.hour >= 21 or log.created_at.hour < 3):
                grouped[b].append(log)
            elif b != 0 and b <= log.created_at.hour < (b + 3):
                grouped[b].append(log)

    labels = ["6am", "9am", "12pm", "3pm", "6pm", "9pm", "12am"]
    result = []
    for idx, b in enumerate(bins):
        block = grouped.get(b, [])
        if not block:
            result.append(TimelinePoint(label=labels[idx], focus=0, distraction=0))
            continue
        focus = round((sum(_is_positive(x) for x in block) / len(block)) * 100, 1)
        distraction = round((sum(_is_negative(x) for x in block) / len(block)) * 100, 1)
        result.append(TimelinePoint(label=labels[idx], focus=focus, distraction=distraction))
    return result


def _build_weekday_trends(logs: list[BehaviorLog]) -> list[EmotionTrendPoint]:
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    grouped = defaultdict(list)
    for log in logs:
        grouped[log.created_at.weekday()].append(log)

    points = []
    for idx, day in enumerate(days):
        block = grouped.get(idx, [])
        if not block:
            points.append(EmotionTrendPoint(label=day, productive=0, distracted=0))
            continue

        productive = round((sum(_is_positive(x) for x in block) / len(block)) * 100, 1)
        distracted = round((sum(_is_negative(x) for x in block) / len(block)) * 100, 1)
        points.append(EmotionTrendPoint(label=day, productive=productive, distracted=distracted))
    return points
