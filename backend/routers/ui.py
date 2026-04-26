from collections import Counter, defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.behavior import BehaviorLog, User
from backend.schemas.ui import (
    AchievementItem,
    AnalysisResponse,
    BehaviorDistributionItem,
    ChatBootstrapResponse,
    ChatRequest,
    ChatResponse,
    EmotionTrendPoint,
    GoalItem,
    HabitFrequencyItem,
    InsightItem,
    OverviewResponse,
    ProfileMetricItem,
    ProfileResponse,
    RadarMetricItem,
    RecommendationItem,
    RecentActivityItem,
    StatCard,
    TimelinePoint,
    WeeklyActivityItem,
)
from backend.services.ai_feedback_service import AIFeedbackService
from backend.services.pattern_analysis_service import PatternAnalysisService
from backend.services.analysis_result_service import AnalysisResultService

router = APIRouter(prefix="/api/ui", tags=["UI"])
ai_service = AIFeedbackService()

NEGATIVE_EMOTIONS = {"sad", "angry", "anxious", "stressed", "depressed"}
POSITIVE_EMOTIONS = {"happy", "focused", "calm", "motivated", "neutral"}
CHAT_SUGGESTIONS = [
    "Why am I unproductive?",
    "Analyze my habits",
    "How can I focus better?",
    "What's my best time to study?",
]


@router.get("/{user_id}/overview", response_model=OverviewResponse)
def get_overview(user_id: int, db: Session = Depends(get_db)):
    user = _get_user(user_id, db)
    logs = _get_logs(user_id, db, days=7, ascending=True)

    if not logs:
        return OverviewResponse(
            welcome_name=_format_display_name(user.username),
            stat_cards=[
                StatCard(
                    title="Most Frequent Behavior",
                    value="No logs yet",
                    subtitle="Start logging to see patterns",
                    trend="neutral",
                ),
                StatCard(title="Worst Habit Time", value="-", subtitle="Need more data", trend="neutral"),
                StatCard(title="Best Focus Time", value="-", subtitle="Need more data", trend="neutral"),
                StatCard(title="Weekly Progress", value="0%", subtitle="Add at least one behavior", trend="neutral"),
            ],
            daily_timeline=_build_timeline([]),
            emotion_trends=_build_weekday_trends([]),
            habit_frequency=[],
            insights=[
                InsightItem(
                    title="No data yet",
                    description="Log your first behavior to unlock AI insights.",
                    type="info",
                )
            ],
            recent_activity=[],
        )

    analysis = _get_or_create_analysis(user_id=user_id, days=7, db=db)
    tag_counter = Counter(log.tag or "Other" for log in logs)
    most_tag, most_count = tag_counter.most_common(1)[0]
    hour_groups = _group_logs_by_hour(logs)
    worst_hour = max(hour_groups, key=lambda hour: _ratio(hour_groups[hour], _is_negative))
    best_hour = max(hour_groups, key=lambda hour: _ratio(hour_groups[hour], _is_positive))
    progress_value = _weekly_progress(logs)
    progress_prefix = "+" if progress_value >= 0 else ""

    return OverviewResponse(
        welcome_name=_format_display_name(user.username),
        stat_cards=[
            StatCard(
                title="Most Frequent Behavior",
                value=most_tag,
                subtitle=f"{most_count} times this week",
                trend="up",
            ),
            StatCard(
                title="Worst Habit Time",
                value=_hour_range(worst_hour),
                subtitle="Higher distraction tendency",
                trend="down",
            ),
            StatCard(
                title="Best Focus Time",
                value=_hour_range(best_hour),
                subtitle="Highest productivity tendency",
                trend="up",
            ),
            StatCard(
                title="Weekly Progress",
                value=f"{progress_prefix}{progress_value}%",
                subtitle="Better than last week" if progress_value >= 0 else "Slightly behind last week",
                trend="up" if progress_value >= 0 else "down",
            ),
        ],
        daily_timeline=_build_timeline(logs),
        emotion_trends=_build_weekday_trends(logs),
        habit_frequency=[HabitFrequencyItem(tag=tag, count=count) for tag, count in tag_counter.most_common(6)],
        insights=_build_analysis_insights(logs, analysis),
        recent_activity=[
            RecentActivityItem(
                id=log.id,
                text=log.text,
                tag=log.tag,
                emotion=log.emotion,
                created_at=log.created_at,
            )
            for log in sorted(logs, key=lambda item: item.created_at, reverse=True)[:6]
        ],
    )


@router.get("/{user_id}/analysis", response_model=AnalysisResponse)
def get_analysis_view(user_id: int, db: Session = Depends(get_db)):
    _get_user(user_id, db)
    logs = _get_logs(user_id, db, days=7, ascending=True)
    analysis = _get_or_create_analysis(user_id=user_id, days=7, db=db)

    return AnalysisResponse(
        insights=_build_analysis_insights(logs, analysis),
        behavior_distribution=_build_behavior_distribution(logs),
        weekly_pattern=_build_weekly_pattern(logs),
        recommendations=_build_recommendations(logs, analysis),
    )


@router.get("/{user_id}/profile", response_model=ProfileResponse)
def get_profile_view(user_id: int, db: Session = Depends(get_db)):
    user = _get_user(user_id, db)
    all_logs = _get_logs(user_id, db, days=30, ascending=True)
    recent_logs = [log for log in all_logs if log.created_at >= datetime.utcnow() - timedelta(days=7)]
    analysis = _get_or_create_analysis(user_id=user_id, days=7, db=db)
    days_active = len({log.created_at.date() for log in all_logs})
    current_streak = _current_streak(all_logs)
    morning_positive = len(
        [log for log in recent_logs if 6 <= log.created_at.hour < 12 and _is_positive(log)]
    )

    return ProfileResponse(
        display_name=_format_display_name(user.username),
        member_since=user.created_at.strftime("%B %Y"),
        stats=[
            ProfileMetricItem(title="Total Behaviors", value=str(len(all_logs)), icon="check"),
            ProfileMetricItem(title="Days Active", value=str(days_active), icon="calendar"),
            ProfileMetricItem(title="Current Streak", value=f"{current_streak} days", icon="flame"),
            ProfileMetricItem(
                title="Insights Generated",
                value=str(len(_build_analysis_insights(recent_logs, analysis))),
                icon="trend",
            ),
        ],
        weekly_activity=_build_weekly_activity(recent_logs),
        goals=_build_goals(recent_logs),
        achievements=_build_achievements(
            all_logs=all_logs,
            recent_logs=recent_logs,
            morning_positive=morning_positive,
            current_streak=current_streak,
            analysis=analysis,
        ),
    )


@router.get("/{user_id}/chat/bootstrap", response_model=ChatBootstrapResponse)
def get_chat_bootstrap(user_id: int, db: Session = Depends(get_db)):
    user = _get_user(user_id, db)
    analysis = _get_or_create_analysis(user_id=user_id, days=7, db=db)
    top_emotion = analysis.behavior_patterns[0].emotion if analysis.behavior_patterns else "your habits"
    intro = (
        "Hi! I'm your behavior analysis assistant. I've analyzed your recent patterns and I'm ready to help "
        f"you understand your habits better. Your strongest signal right now is {top_emotion}."
    )

    return ChatBootstrapResponse(intro=intro, suggested_prompts=CHAT_SUGGESTIONS)


@router.post("/{user_id}/chat", response_model=ChatResponse)
def chat_with_assistant(user_id: int, payload: ChatRequest, db: Session = Depends(get_db)):
    user = _get_user(user_id, db)
    analysis = _get_or_create_analysis(user_id=user_id, days=14, db=db)
    summary = ai_service.generate_feedback(analysis)

    answer = (
        f"Question: {payload.message}\n\n"
        f"Here is a concise behavior summary for {_format_display_name(user.username)} based on the most recent logs.\n\n"
        f"{summary}"
    )
    return ChatResponse(answer=answer)


def _get_user(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_or_create_analysis(user_id: int, days: int, db: Session):
    cached = AnalysisResultService.get_latest_valid(user_id=user_id, days=days, db=db)
    if cached:
        return AnalysisResultService.to_schema(cached)

    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=days, db=db)
    saved = AnalysisResultService.save_result(result=analysis, db=db)
    return AnalysisResultService.to_schema(saved)


def _get_logs(user_id: int, db: Session, days: int, ascending: bool = False) -> list[BehaviorLog]:
    since = datetime.utcnow() - timedelta(days=days)
    query = db.query(BehaviorLog).filter(
        (BehaviorLog.user_id == user_id) & (BehaviorLog.created_at >= since)
    )
    order = BehaviorLog.created_at.asc() if ascending else BehaviorLog.created_at.desc()
    return query.order_by(order).all()


def _format_display_name(username: str) -> str:
    return username.replace("_", " ").title()


def _is_negative(log: BehaviorLog) -> int:
    return int(log.emotion.lower() in NEGATIVE_EMOTIONS)


def _is_positive(log: BehaviorLog) -> int:
    return int(log.emotion.lower() in POSITIVE_EMOTIONS)


def _group_logs_by_hour(logs: list[BehaviorLog]) -> dict[int, list[BehaviorLog]]:
    groups = defaultdict(list)
    for log in logs:
        groups[log.created_at.hour].append(log)
    return groups or {9: []}


def _ratio(logs: list[BehaviorLog], predicate) -> float:
    if not logs:
        return 0
    return sum(predicate(log) for log in logs) / len(logs)


def _to_12_hour(hour: int) -> tuple[int, str]:
    normalized = hour % 24
    suffix = "am" if normalized < 12 else "pm"
    return (12 if normalized % 12 == 0 else normalized % 12), suffix


def _hour_range(hour: int) -> str:
    start_hour, start_suffix = _to_12_hour(hour)
    end_hour, end_suffix = _to_12_hour(hour + 3)
    return f"{start_hour}{start_suffix} - {end_hour}{end_suffix}"


def _weekly_progress(logs: list[BehaviorLog]) -> int:
    positive = sum(_is_positive(log) for log in logs)
    negative = sum(_is_negative(log) for log in logs)
    baseline = max(1, len(logs))
    return round(((positive - negative) / baseline) * 25)


def _build_timeline(logs: list[BehaviorLog]) -> list[TimelinePoint]:
    bins = [6, 9, 12, 15, 18, 21, 0]
    labels = ["6am", "9am", "12pm", "3pm", "6pm", "9pm", "12am"]
    grouped = defaultdict(list)

    for log in logs:
        for hour in bins:
            if hour == 0 and (log.created_at.hour >= 21 or log.created_at.hour < 3):
                grouped[hour].append(log)
            elif hour != 0 and hour <= log.created_at.hour < hour + 3:
                grouped[hour].append(log)

    points = []
    for index, hour in enumerate(bins):
        block = grouped.get(hour, [])
        points.append(
            TimelinePoint(
                label=labels[index],
                focus=round(_ratio(block, _is_positive) * 100, 1) if block else 0,
                distraction=round(_ratio(block, _is_negative) * 100, 1) if block else 0,
            )
        )
    return points


def _build_weekday_trends(logs: list[BehaviorLog]) -> list[EmotionTrendPoint]:
    grouped = defaultdict(list)
    for log in logs:
        grouped[log.created_at.weekday()].append(log)

    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return [
        EmotionTrendPoint(
            label=day,
            productive=round(_ratio(grouped.get(index, []), _is_positive) * 100, 1),
            distracted=round(_ratio(grouped.get(index, []), _is_negative) * 100, 1),
        )
        for index, day in enumerate(days)
    ]


def _build_analysis_insights(logs: list[BehaviorLog], analysis) -> list[InsightItem]:
    if not logs:
        return [
            InsightItem(
                title="No activity to analyze yet",
                description="Log a few behaviors and your AI insights will appear here.",
                type="info",
            )
        ]

    hour_groups = _group_logs_by_hour(logs)
    worst_hour = max(hour_groups, key=lambda hour: _ratio(hour_groups[hour], _is_negative))
    best_hour = max(hour_groups, key=lambda hour: _ratio(hour_groups[hour], _is_positive))
    study_count = len([log for log in logs if (log.tag or "").lower() in {"study", "reading", "work"}])
    late_logs = len([log for log in logs if log.created_at.hour >= 21 or log.created_at.hour < 1])

    insights = [
        InsightItem(
            title="You tend to procrastinate at night",
            description=f"Between {_hour_range(worst_hour)}, your distraction rate is the highest this week.",
            type="warning",
        ),
        InsightItem(
            title="Your focus peaks in the morning",
            description=f"{_hour_range(best_hour)} shows your strongest productivity pattern.",
            type="success",
        ),
        InsightItem(
            title="Inconsistent sleep schedule detected",
            description=f"You logged {late_logs} late-night behaviors this week. A steadier cutoff time could help.",
            type="warning",
        ),
        InsightItem(
            title="Study sessions are improving",
            description=f"You logged {study_count} focused study or work sessions this week. Keep building on that rhythm.",
            type="info",
        ),
    ]

    if analysis.risky_patterns:
        insights[0] = InsightItem(
            title=analysis.risky_patterns[0].pattern.replace("_", " ").title(),
            description=analysis.risky_patterns[0].description,
            type="warning",
        )

    return insights[:4]


def _build_behavior_distribution(logs: list[BehaviorLog]) -> list[BehaviorDistributionItem]:
    if not logs:
        return []

    positive = sum(_is_positive(log) for log in logs)
    negative = sum(_is_negative(log) for log in logs)
    neutral = max(0, len(logs) - positive - negative)
    total = len(logs)

    return [
        BehaviorDistributionItem(
            label="Productive",
            value=round((positive / total) * 100, 1),
            category="productive",
        ),
        BehaviorDistributionItem(
            label="Neutral",
            value=round((neutral / total) * 100, 1),
            category="neutral",
        ),
        BehaviorDistributionItem(
            label="Distracting",
            value=round((negative / total) * 100, 1),
            category="distracting",
        ),
    ]


def _build_weekly_pattern(logs: list[BehaviorLog]) -> list[RadarMetricItem]:
    segments = {
        "Morning": [log for log in logs if 6 <= log.created_at.hour < 12],
        "Afternoon": [log for log in logs if 12 <= log.created_at.hour < 17],
        "Evening": [log for log in logs if 17 <= log.created_at.hour < 21],
        "Night": [log for log in logs if log.created_at.hour >= 21 or log.created_at.hour < 6],
        "Focus": logs,
        "Energy": logs,
    }

    metrics = []
    for label, items in segments.items():
        if label == "Energy":
            value = round((sum(log.intensity for log in items) / len(items)) * 10, 1) if items else 0
        else:
            value = round(_ratio(items, _is_positive) * 100, 1) if items else 0
        metrics.append(RadarMetricItem(label=label, value=value))
    return metrics


def _build_recommendations(logs: list[BehaviorLog], analysis) -> list[RecommendationItem]:
    worst_label = "9pm - 12am"
    if logs:
        worst_groups = _group_logs_by_hour(logs)
        worst_hour = max(worst_groups, key=lambda hour: _ratio(worst_groups[hour], _is_negative))
        worst_label = _hour_range(worst_hour)

    recommendations = [
        RecommendationItem(
            title="Block distracting websites",
            description=f"Protect your most vulnerable window around {worst_label} with tighter blockers or app limits.",
            impact="High",
        ),
        RecommendationItem(
            title="Set a consistent sleep schedule",
            description="Aim for the same screen-off and bedtime routine every night to reduce late-hour drift.",
            impact="High",
        ),
        RecommendationItem(
            title="Take regular breaks",
            description="Use short focus sprints with deliberate breaks so productive sessions stay sustainable.",
            impact="Medium",
        ),
        RecommendationItem(
            title="Plan tomorrow before logging off",
            description="Write your top task for the next day before bed so mornings start with less friction.",
            impact="Medium",
        ),
    ]

    if analysis.risky_patterns:
        recommendations[0] = RecommendationItem(
            title="Reduce your highest-risk pattern",
            description=analysis.risky_patterns[0].description,
            impact="High" if analysis.risky_patterns[0].severity == "high" else "Medium",
        )

    return recommendations


def _build_weekly_activity(logs: list[BehaviorLog]) -> list[WeeklyActivityItem]:
    grouped = defaultdict(list)
    for log in logs:
        grouped[log.created_at.weekday()].append(log)

    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    items = []
    for index, label in enumerate(labels):
        block = grouped.get(index, [])
        productive = sum(_is_positive(log) for log in block)
        other = max(0, len(block) - productive)
        items.append(WeeklyActivityItem(label=label, productive=productive, other=other))
    return items


def _build_goals(logs: list[BehaviorLog]) -> list[GoalItem]:
    study_sessions = len([log for log in logs if (log.tag or "").lower() in {"study", "reading", "work"}])
    exercise_sessions = len([log for log in logs if (log.tag or "").lower() == "exercise"])
    sleep_success = len(
        {
            log.created_at.date()
            for log in logs
            if log.created_at.hour < 23 and (log.created_at.hour >= 18 or log.created_at.hour < 6)
        }
    )

    definitions = [
        ("Log 30 behaviors", len(logs), 30),
        ("Study 20 hours", min(study_sessions * 4, 20), 20),
        ("Exercise 5 times", exercise_sessions, 5),
        ("Sleep before 11pm", sleep_success, 7),
    ]

    goals = []
    for title, current, total in definitions:
        tone = "warning" if (current / total if total else 0) < 0.5 else "success"
        goals.append(GoalItem(title=title, current=current, total=total, tone=tone))
    return goals


def _build_achievements(
    all_logs: list[BehaviorLog],
    recent_logs: list[BehaviorLog],
    morning_positive: int,
    current_streak: int,
    analysis,
) -> list[AchievementItem]:
    timeline = _build_timeline(recent_logs)
    best_focus = max(timeline, key=lambda point: point.focus, default=TimelinePoint(label="6am", focus=0, distraction=0))
    distribution = _build_behavior_distribution(recent_logs)
    distracting_ratio = distribution[-1].value if distribution else 100

    return [
        AchievementItem(
            title="First Week",
            description="Logged behaviors for 7 days straight",
            unlocked=current_streak >= 7,
            icon="🎉",
        ),
        AchievementItem(
            title="Morning Person",
            description="Started 5 days before 8am",
            unlocked=morning_positive >= 5,
            icon="🌅",
        ),
        AchievementItem(
            title="Focus Master",
            description="Achieved 90%+ focus for a day",
            unlocked=best_focus.focus >= 85,
            icon="🎯",
        ),
        AchievementItem(
            title="Consistency King",
            description="30-day streak",
            unlocked=current_streak >= 30,
            icon="👑",
        ),
        AchievementItem(
            title="Self Awareness",
            description="Generated 50 insights",
            unlocked=len(all_logs) >= 50 and len(_build_analysis_insights(recent_logs, analysis)) >= 4,
            icon="🧠",
        ),
        AchievementItem(
            title="Habit Breaker",
            description="Reduced bad habit by 50%",
            unlocked=distracting_ratio <= 25 and len(all_logs) >= 20,
            icon="💪",
        ),
    ]


def _current_streak(logs: list[BehaviorLog]) -> int:
    if not logs:
        return 0

    active_days = sorted({log.created_at.date() for log in logs}, reverse=True)
    streak = 0
    cursor = active_days[0]

    for day in active_days:
        if day == cursor:
            streak += 1
            cursor = cursor - timedelta(days=1)
        elif day < cursor:
            break

    return streak
