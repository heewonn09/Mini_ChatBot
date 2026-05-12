from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import require_same_user
from backend.database import get_db
from backend.models.behavior import BehaviorLog
from backend.models.chat import ChatHistory
from backend.models.user import User
from backend.redis_client import redis_client
from backend.schemas.ui import (
    AnalysisViewResponse,
    ChatBootstrapResponse,
    ChatHistoryItem,
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    DashboardOverviewResponse,
    ProfileViewResponse,
)
from backend.services.ai_feedback_service import AIFeedbackService
from backend.services.pattern_analysis_service import PatternAnalysisService

router = APIRouter(prefix="/ui", tags=["ui"])
ai_service = AIFeedbackService()


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _get_user(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _format_display_name(username: str) -> str:
    """Capitalise the first letter of each word in the username."""
    return username.replace("_", " ").title()


def _check_chat_rate_limit(user_id: int):
    key = f"rate:chat:{user_id}"
    count = redis_client.incr_with_ttl(key, ttl=60)
    if count > 20:
        raise HTTPException(status_code=429, detail="Too many chat requests. Try again in a minute.")


# ---------------------------------------------------------------------------
# Dashboard overview
# ---------------------------------------------------------------------------

@router.get("/{user_id}/overview", response_model=DashboardOverviewResponse)
def get_overview(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    recent_logs = (
        db.query(BehaviorLog)
        .filter(BehaviorLog.user_id == user_id, BehaviorLog.created_at >= week_ago)
        .order_by(BehaviorLog.created_at.desc())
        .limit(20)
        .all()
    )

    # Build timeline bins (3-hour windows)
    timeline_bins = {}
    for log in recent_logs:
        h = log.created_at.hour
        bin_start = (h // 3) * 3
        if bin_start not in timeline_bins:
            timeline_bins[bin_start] = {"focus": 0, "distraction": 0}
        tag = (log.tag or "").lower()
        if tag in ("study", "exercise"):
            timeline_bins[bin_start]["focus"] += 1
        elif tag in ("social_media", "youtube"):
            timeline_bins[bin_start]["distraction"] += 1

    timeline = [
        {"hour": h, "focus": v["focus"], "distraction": v["distraction"]}
        for h, v in sorted(timeline_bins.items())
    ]

    # Emotion trend data
    emotion_map: dict[str, dict] = {}
    for log in recent_logs:
        e = log.emotion or "neutral"
        if e not in emotion_map:
            emotion_map[e] = {"productive": 0, "distracted": 0}
        tag = (log.tag or "").lower()
        if tag in ("study", "exercise"):
            emotion_map[e]["productive"] += 1
        elif tag in ("social_media", "youtube"):
            emotion_map[e]["distracted"] += 1
    emotion_trends = [
        {"emotion": e, "productive": v["productive"], "distracted": v["distracted"]}
        for e, v in emotion_map.items()
    ]

    # Habit frequency
    tag_counts: dict[str, int] = {}
    for log in recent_logs:
        t = log.tag or "other"
        tag_counts[t] = tag_counts.get(t, 0) + 1
    habit_frequency = [
        {"habit": t, "count": c}
        for t, c in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # Stat cards
    stat_cards = []
    if analysis.behavior_patterns:
        top = analysis.behavior_patterns[0]
        stat_cards.append({"key": "most_frequent_behavior", "value": top.emotion})
    if analysis.risky_patterns:
        rp = analysis.risky_patterns[0]
        stat_cards.append({"key": "worst_habit_time", "value": rp.pattern})
    best_focus = _find_best_focus_hour(recent_logs)
    if best_focus is not None:
        stat_cards.append({"key": "best_focus_time", "value": f"{best_focus}:00"})
    total = len(recent_logs)
    stat_cards.append({"key": "weekly_progress", "value": f"{total} logs"})

    # Recent activity (last 5 logs)
    recent_activity = [
        {
            "id": log.id,
            "text": log.text,
            "tag": log.tag,
            "emotion": log.emotion,
            "created_at": log.created_at.isoformat(),
        }
        for log in recent_logs[:5]
    ]

    # Focus window & risk zone
    focus_window = _get_focus_window(recent_logs)
    risk_zone = _get_risk_zone(recent_logs)

    # Routine / pattern / protect summaries
    routine_summary = _build_routine_summary(analysis)
    pattern_summary = _build_pattern_summary(analysis)
    protect_summary = _build_protect_summary(analysis)

    return DashboardOverviewResponse(
        user_display_name=_format_display_name(user.username),
        stat_cards=stat_cards,
        timeline=timeline,
        emotion_trends=emotion_trends,
        habit_frequency=habit_frequency,
        recent_activity=recent_activity,
        focus_window=focus_window,
        risk_zone=risk_zone,
        routine_summary=routine_summary,
        pattern_summary=pattern_summary,
        protect_summary=protect_summary,
    )


def _find_best_focus_hour(logs) -> Optional[int]:
    focus_hours: dict[int, int] = {}
    for log in logs:
        if (log.tag or "").lower() in ("study", "exercise"):
            h = log.created_at.hour
            focus_hours[h] = focus_hours.get(h, 0) + 1
    if not focus_hours:
        return None
    return max(focus_hours, key=lambda h: focus_hours[h])


def _get_focus_window(logs) -> Optional[str]:
    best = _find_best_focus_hour(logs)
    if best is None:
        return None
    end = (best + 2) % 24
    return f"{best:02d}:00 – {end:02d}:00"


def _get_risk_zone(logs) -> Optional[str]:
    distract_hours: dict[int, int] = {}
    for log in logs:
        if (log.tag or "").lower() in ("social_media", "youtube"):
            h = log.created_at.hour
            distract_hours[h] = distract_hours.get(h, 0) + 1
    if not distract_hours:
        return None
    worst = max(distract_hours, key=lambda h: distract_hours[h])
    end = (worst + 2) % 24
    return f"{worst:02d}:00 – {end:02d}:00"


def _build_routine_summary(analysis) -> Optional[str]:
    if not analysis.behavior_patterns:
        return None
    top = analysis.behavior_patterns[0]
    return f"Your most common state is {top.emotion} ({top.percentage}% of logs)."


def _build_pattern_summary(analysis) -> Optional[str]:
    if not analysis.emotional_trends:
        return None
    trend = analysis.emotional_trends[0]
    return f"{trend.emotion.capitalize()} is showing a {trend.trend} trend recently."


def _build_protect_summary(analysis) -> Optional[str]:
    if not analysis.risky_patterns:
        return None
    rp = analysis.risky_patterns[0]
    return f"Watch out for {rp.pattern}: {rp.description}"


# ---------------------------------------------------------------------------
# Analysis view
# ---------------------------------------------------------------------------

@router.get("/{user_id}/analysis", response_model=AnalysisViewResponse)
def get_analysis_view(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)
    ai_feedback = ai_service.generate_feedback(analysis)

    behavior_distribution = [
        {"name": p.emotion, "value": p.percentage, "count": p.count}
        for p in analysis.behavior_patterns
    ]

    weekly_pattern = _build_weekly_pattern(user_id, db)

    spotlight = None
    spotlight_desc = None
    if analysis.behavior_patterns:
        top = analysis.behavior_patterns[0]
        spotlight = f"{top.emotion.capitalize()} dominates at {top.percentage}%"
        spotlight_desc = f"You logged {top.emotion} {top.count} times over the last 7 days."

    recommended_actions = []
    if analysis.risky_patterns:
        for rp in analysis.risky_patterns[:2]:
            recommended_actions.append({"action": f"Address {rp.pattern}", "detail": rp.description})
    if analysis.behavior_patterns:
        recommended_actions.append({
            "action": "Keep logging consistently",
            "detail": "More data gives sharper insights.",
        })

    performance_score = _calculate_performance(analysis)

    return AnalysisViewResponse(
        ai_feedback=ai_feedback,
        behavior_distribution=behavior_distribution,
        weekly_pattern=weekly_pattern,
        spotlight=spotlight,
        spotlight_desc=spotlight_desc,
        recommended_actions=recommended_actions,
        performance_score=performance_score,
    )


def _build_weekly_pattern(user_id: int, db: Session):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    logs = (
        db.query(BehaviorLog)
        .filter(BehaviorLog.user_id == user_id, BehaviorLog.created_at >= week_ago)
        .all()
    )
    bins = {}
    for log in logs:
        h = log.created_at.hour
        bin_start = (h // 3) * 3
        if bin_start not in bins:
            bins[bin_start] = {"productive": 0, "neutral": 0, "distracted": 0}
        tag = (log.tag or "").lower()
        if tag in ("study", "exercise"):
            bins[bin_start]["productive"] += 1
        elif tag in ("social_media", "youtube"):
            bins[bin_start]["distracted"] += 1
        else:
            bins[bin_start]["neutral"] += 1
    return [
        {"hour": h, **v}
        for h, v in sorted(bins.items())
    ]


def _calculate_performance(analysis) -> int:
    if not analysis.behavior_patterns:
        return 50
    productive_pct = sum(
        p.percentage for p in analysis.behavior_patterns
        if p.emotion in ("focused", "motivated", "happy")
    )
    risk_penalty = len(analysis.risky_patterns) * 5
    return max(0, min(100, int(productive_pct) - risk_penalty))


# ---------------------------------------------------------------------------
# Profile view
# ---------------------------------------------------------------------------

@router.get("/{user_id}/profile", response_model=ProfileViewResponse)
def get_profile_view(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=30, db=db)

    all_logs = (
        db.query(BehaviorLog)
        .filter(BehaviorLog.user_id == user_id)
        .order_by(BehaviorLog.created_at.desc())
        .limit(100)
        .all()
    )

    # Stats cards
    stats = [
        {"title": "Total Behaviors", "value": str(len(all_logs)), "icon": "check"},
        {"title": "Days Active", "value": str(_count_active_days(all_logs)), "icon": "calendar"},
        {"title": "Current Streak", "value": f"{_calculate_streak(all_logs)}d", "icon": "flame"},
        {"title": "Insights Generated", "value": str(max(1, len(all_logs) // 5)), "icon": "trend"},
    ]

    # Top habits
    tag_counts: dict[str, int] = {}
    for log in all_logs:
        t = log.tag or "other"
        tag_counts[t] = tag_counts.get(t, 0) + 1
    top_habits = [
        {"tag": t, "count": c}
        for t, c in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # Weekly activity
    weekly_activity = _build_weekly_activity(all_logs)

    # Goals
    goals = _build_goals(all_logs, analysis)

    # Achievements
    achievements = _build_achievements(all_logs, analysis)

    # Summary
    summary_title, summary_description = _build_profile_summary(user.username, analysis, all_logs)

    member_since = user.created_at.isoformat() if hasattr(user, "created_at") and user.created_at else datetime.now(timezone.utc).isoformat()

    recent_activity_items = [
        {
            "id": log.id,
            "text": log.text,
            "tag": log.tag,
            "emotion": log.emotion,
            "created_at": log.created_at.isoformat(),
        }
        for log in all_logs[:30]
    ]

    return ProfileViewResponse(
        display_name=_format_display_name(user.username),
        member_since=member_since,
        stats=stats,
        top_habits=top_habits,
        weekly_activity=weekly_activity,
        goals=goals,
        achievements=achievements,
        summary_title=summary_title,
        summary_description=summary_description,
        recent_activity=recent_activity_items,
    )


def _count_active_days(logs) -> int:
    return len({log.created_at.date() for log in logs})


def _calculate_streak(logs) -> int:
    if not logs:
        return 0
    dates = sorted({log.created_at.date() for log in logs}, reverse=True)
    streak = 1
    for i in range(1, len(dates)):
        if (dates[i - 1] - dates[i]).days == 1:
            streak += 1
        else:
            break
    return streak


def _build_weekly_activity(logs):
    now = datetime.now(timezone.utc)
    days = []
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_logs = [log for log in logs if log.created_at.date() == day]
        productive = sum(
            1 for log in day_logs if (log.tag or "").lower() in ("study", "exercise")
        )
        other = len(day_logs) - productive
        days.append({"label": labels[day.weekday()], "productive": productive, "other": other})
    return days


def _build_goals(logs, analysis):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    week_logs = [log for log in logs if log.created_at >= week_ago]
    study_count = sum(1 for log in week_logs if (log.tag or "").lower() == "study")
    exercise_count = sum(1 for log in week_logs if (log.tag or "").lower() == "exercise")
    return [
        {"title": "Study sessions", "current": min(study_count, 5), "total": 5, "tone": "normal"},
        {"title": "Workouts", "current": min(exercise_count, 3), "total": 3, "tone": "normal"},
        {"title": "Total logs", "current": min(len(week_logs), 10), "total": 10, "tone": "normal"},
    ]


def _build_achievements(logs, analysis):
    streak = _calculate_streak(logs)
    active_days = _count_active_days(logs)
    study_logs = [log for log in logs if (log.tag or "").lower() == "study"]
    morning_logs = [log for log in logs if log.created_at.hour < 9]
    return [
        {"title": "First Week", "description": "Logged for 7 days.", "unlocked": active_days >= 7},
        {"title": "Morning Person", "description": "Logged 5 morning entries.", "unlocked": len(morning_logs) >= 5},
        {"title": "Focus Master", "description": "20 study sessions logged.", "unlocked": len(study_logs) >= 20},
        {"title": "Consistency King", "description": "14-day streak.", "unlocked": streak >= 14},
        {"title": "Self Awareness", "description": "50 total logs.", "unlocked": len(logs) >= 50},
        {"title": "Habit Breaker", "description": "Reduced distracting entries.", "unlocked": False},
    ]


def _build_profile_summary(username: str, analysis, logs):
    name = _format_display_name(username)
    if not logs:
        return None, f"Start logging your behaviors to get a personalized summary, {name}."
    streak = _calculate_streak(logs)
    if streak >= 7:
        title = f"{streak} days of consistent momentum."
    elif analysis.behavior_patterns:
        top = analysis.behavior_patterns[0]
        title = f"{top.percentage}% {top.emotion} — your dominant state."
    else:
        title = "Your pattern map is forming."
    productive_pct = sum(
        p.percentage for p in analysis.behavior_patterns
        if p.emotion in ("focused", "motivated", "happy")
    )
    desc = (
        f"{name} has logged {len(logs)} behaviors. "
        f"Productive states make up {productive_pct:.0f}% of recent activity."
    )
    return title, desc


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

@router.get("/{user_id}/chat/bootstrap", response_model=ChatBootstrapResponse)
def get_chat_bootstrap(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    name = _format_display_name(user.username)
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)

    if analysis.behavior_patterns:
        top = analysis.behavior_patterns[0]
        intro = (
            f"Hi {name}! I can see {top.emotion} is your dominant state ({top.percentage}% of recent logs). "
            f"Want to dig into what's driving that?"
        )
    else:
        intro = f"Hi {name}! Start by asking me about your habits or patterns — I'm here to help."

    return ChatBootstrapResponse(
        intro=intro,
        suggested_prompts=[
            "What's my most productive time of day?",
            "Which habit should I fix first?",
            "Why do I keep getting distracted?",
            "How can I build a better morning routine?",
        ],
    )


@router.post("/{user_id}/chat", response_model=ChatResponse)
def chat_with_assistant(
    user_id: int,
    payload: ChatRequest,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _check_chat_rate_limit(user_id)
    user = _get_user(user_id, db)
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=14, db=db)
    behavior_summary = ai_service.generate_feedback(analysis)

    recent_messages = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == user_id)
        .order_by(ChatHistory.created_at.desc())
        .limit(8)
        .all()
    )
    memory = "\n".join(f"{item.role}: {item.message}" for item in reversed(recent_messages))

    answer = ai_service.generate_chat_response(
        user_message=payload.message,
        username=_format_display_name(user.username),
        behavior_summary=behavior_summary,
        conversation_memory=memory,
        language=getattr(payload, "language", "en"),
    )

    db.add(ChatHistory(user_id=user_id, role="user", message=payload.message))
    db.add(ChatHistory(user_id=user_id, role="assistant", message=answer))
    db.commit()
    return ChatResponse(answer=answer)


@router.get("/{user_id}/chat/history", response_model=ChatHistoryResponse)
def get_chat_history(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    rows = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == user_id)
        .order_by(ChatHistory.created_at.asc())
        .limit(50)
        .all()
    )
    return ChatHistoryResponse(
        items=[ChatHistoryItem(role=row.role, message=row.message, created_at=row.created_at) for row in rows]
    )


def _get_user(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
