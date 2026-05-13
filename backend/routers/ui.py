from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from backend.auth import require_same_user
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.chat import ChatHistory
from backend.models.behavior import BehaviorLog, User
from backend.schemas.ui import (
    AchievementItem,
    AnalysisResponse,
    BehaviorDistributionItem,
    ChatBootstrapResponse,
    ChatHistoryItem,
    ChatHistoryResponse,
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
from backend.redis_client import redis_store

router = APIRouter(prefix="/api/ui", tags=["UI"])
CHAT_RATE_LIMIT = 30
CHAT_RATE_WINDOW = 60
ai_service = AIFeedbackService()

NEGATIVE_EMOTIONS = {"sad", "angry", "anxious", "stressed", "depressed"}
POSITIVE_EMOTIONS = {"happy", "focused", "calm", "motivated", "neutral"}
CHAT_SUGGESTIONS = [
    "왜 나는 생산적이지 않을까요?",
    "내 습관을 분석해줘",
    "어떻게 하면 더 집중할 수 있나요?",
    "공부하기 가장 좋은 시간대가 언제인가요?",
]


@router.get("/{user_id}/overview", response_model=OverviewResponse)
def get_overview(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    logs = _get_logs(user_id, db, days=7, ascending=True)

    if not logs:
        return OverviewResponse(
            welcome_name=_format_display_name(user.username),
            stat_cards=[
                StatCard(
                    title="가장 많은 행동",
                    value="기록 없음",
                    subtitle="기록을 시작하면 패턴이 보여요",
                    trend="neutral",
                ),
                StatCard(title="최악의 습관 시간", value="-", subtitle="데이터가 더 필요해요", trend="neutral"),
                StatCard(title="최고 집중 시간", value="-", subtitle="데이터가 더 필요해요", trend="neutral"),
                StatCard(title="주간 진도", value="0%", subtitle="행동을 하나 이상 기록해주세요", trend="neutral"),
            ],
            daily_timeline=_build_timeline([]),
            emotion_trends=_build_weekday_trends([]),
            habit_frequency=[],
            insights=[
                InsightItem(
                    title="아직 데이터 없음",
                    description="첫 행동을 기록하면 AI 인사이트가 열려요.",
                    type="info",
                )
            ],
            recent_activity=[],
        )

    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)
    tag_counter = Counter(log.tag or "기타" for log in logs)
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
                title="가장 많은 행동",
                value=most_tag,
                subtitle=f"이번 주 {most_count}회",
                trend="up",
            ),
            StatCard(
                title="최악의 습관 시간",
                value=_hour_range(worst_hour),
                subtitle="집중력 저하 구간",
                trend="down",
            ),
            StatCard(
                title="최고 집중 시간",
                value=_hour_range(best_hour),
                subtitle="최고 생산성 구간",
                trend="up",
            ),
            StatCard(
                title="주간 진도",
                value=f"{progress_prefix}{progress_value}%",
                subtitle="지난주보다 향상" if progress_value >= 0 else "지난주보다 소폭 하락",
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
def get_analysis_view(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    logs = _get_logs(user_id, db, days=7, ascending=True)
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)

    return AnalysisResponse(
        insights=_build_analysis_insights(logs, analysis),
        behavior_distribution=_build_behavior_distribution(logs),
        weekly_pattern=_build_weekly_pattern(logs),
        recommendations=_build_recommendations(logs, analysis),
    )


@router.get("/{user_id}/profile", response_model=ProfileResponse)
def get_profile_view(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    all_logs = _get_logs(user_id, db, days=30, ascending=True)
    recent_logs = [log for log in all_logs if log.created_at >= datetime.now() - timedelta(days=7)]
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)
    days_active = len({log.created_at.date() for log in all_logs})
    current_streak = _current_streak(all_logs)
    recent_tag_counter = Counter(log.tag or "Other" for log in recent_logs)
    morning_positive = len(
        [log for log in recent_logs if 6 <= log.created_at.hour < 12 and _is_positive(log)]
    )
    focus_groups = _group_logs_by_hour(recent_logs)
    best_hour = max(focus_groups, key=lambda hour: _ratio(focus_groups[hour], _is_positive))

    return ProfileResponse(
        display_name=_format_display_name(user.username),
        member_since=user.created_at.strftime("%Y-%m-01"),
        summary_title=_build_profile_summary_title(current_streak, days_active, len(all_logs)),
        summary_description=_build_profile_summary_description(
            recent_logs=recent_logs,
            recent_tag_counter=recent_tag_counter,
            best_hour=best_hour,
        ),
        stats=[
            ProfileMetricItem(title="총 행동 수", value=str(len(all_logs)), icon="check"),
            ProfileMetricItem(title="활동 일수", value=str(days_active), icon="calendar"),
            ProfileMetricItem(title="현재 연속 기록", value=f"{current_streak}일", icon="flame"),
            ProfileMetricItem(
                title="생성된 인사이트",
                value=str(len(_build_analysis_insights(recent_logs, analysis))),
                icon="trend",
            ),
        ],
        top_habits=[HabitFrequencyItem(tag=tag, count=count) for tag, count in recent_tag_counter.most_common(4)],
        recent_activity=[
            RecentActivityItem(
                id=log.id,
                text=log.text,
                tag=log.tag,
                emotion=log.emotion,
                created_at=log.created_at,
            )
            for log in sorted(recent_logs, key=lambda item: item.created_at, reverse=True)[:5]
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
def get_chat_bootstrap(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)
    top_emotion = analysis.behavior_patterns[0].emotion if analysis.behavior_patterns else "습관"
    intro = (
        f"안녕하세요, {_format_display_name(user.username)}님! 저는 행동 분석 어시스턴트입니다. 최근 패턴을 분석했으며 "
        f"습관을 더 잘 이해할 수 있도록 도울 준비가 됐어요. 지금 가장 강한 신호는 '{top_emotion}'입니다."
    )

    history = db.query(ChatHistory).filter(ChatHistory.user_id == user_id).order_by(ChatHistory.created_at.desc()).limit(6).all()
    if history:
        intro += " 최근 대화 내용도 기억하고 있어요."

    return ChatBootstrapResponse(intro=intro, suggested_prompts=CHAT_SUGGESTIONS)


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


def _get_logs(user_id: int, db: Session, days: int, ascending: bool = False) -> list[BehaviorLog]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
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
    groups: dict[int, list[BehaviorLog]] = defaultdict(list)
    for log in logs:
        groups[log.created_at.hour].append(log)
    return groups if groups else {0: []}


def _ratio(logs: list[BehaviorLog], predicate) -> float:
    if not logs:
        return 0
    return sum(predicate(log) for log in logs) / len(logs)


def _to_korean_hour(hour: int) -> str:
    normalized = hour % 24
    prefix = "오전" if normalized < 12 else "오후"
    h = normalized % 12 or 12
    return f"{prefix} {h}시"


def _hour_range(hour: int) -> str:
    return f"{_to_korean_hour(hour)} - {_to_korean_hour(hour + 3)}"


def _weekly_progress(logs: list[BehaviorLog]) -> int:
    positive = sum(_is_positive(log) for log in logs)
    negative = sum(_is_negative(log) for log in logs)
    baseline = max(1, len(logs))
    return round(((positive - negative) / baseline) * 25)


def _build_timeline(logs: list[BehaviorLog]) -> list[TimelinePoint]:
    bins = [6, 9, 12, 15, 18, 21, 0]
    labels = ["오전 6시", "오전 9시", "오후 12시", "오후 3시", "오후 6시", "오후 9시", "자정"]
    grouped = defaultdict(list)

    for log in logs:
        h = log.created_at.hour
        for bin_start in bins:
            if bin_start == 0 and 0 <= h < 3:
                grouped[bin_start].append(log)
                break
            elif bin_start != 0 and bin_start <= h < bin_start + 3:
                grouped[bin_start].append(log)
                break

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

    days = ["월", "화", "수", "목", "금", "토", "일"]
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
                title="분석할 활동이 아직 없어요",
                description="몇 가지 행동을 기록하면 AI 인사이트가 나타나요.",
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
            title="밤에 미루는 경향이 있어요",
            description=f"{_hour_range(worst_hour)} 구간에서 이번 주 방해 비율이 가장 높아요.",
            type="warning",
        ),
        InsightItem(
            title="오전에 집중력이 가장 높아요",
            description=f"{_hour_range(best_hour)}이 가장 강한 생산성 패턴을 보여요.",
            type="success",
        ),
        InsightItem(
            title="불규칙한 취침 패턴이 감지됐어요",
            description=f"이번 주 늦은 밤 행동이 {late_logs}회 기록됐어요. 일정한 마감 시간을 정하면 도움이 될 수 있어요.",
            type="warning",
        ),
        InsightItem(
            title="학습 세션이 개선되고 있어요",
            description=f"이번 주 집중 학습 또는 작업 세션이 {study_count}회 기록됐어요. 그 리듬을 계속 이어가세요.",
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
            label="생산적",
            value=round((positive / total) * 100, 1),
            category="productive",
        ),
        BehaviorDistributionItem(
            label="중립",
            value=round((neutral / total) * 100, 1),
            category="neutral",
        ),
        BehaviorDistributionItem(
            label="방해",
            value=round((negative / total) * 100, 1),
            category="distracting",
        ),
    ]


def _build_weekly_pattern(logs: list[BehaviorLog]) -> list[RadarMetricItem]:
    segments = {
        "오전": [log for log in logs if 6 <= log.created_at.hour < 12],
        "오후": [log for log in logs if 12 <= log.created_at.hour < 17],
        "저녁": [log for log in logs if 17 <= log.created_at.hour < 21],
        "야간": [log for log in logs if log.created_at.hour >= 21 or log.created_at.hour < 6],
        "집중": logs,
        "에너지": logs,
    }

    metrics = []
    for label, items in segments.items():
        if label == "에너지":
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
            title="방해 사이트 차단하기",
            description=f"{worst_label} 전후 취약한 시간대를 앱 제한이나 사이트 차단으로 보호하세요.",
            impact="높음",
        ),
        RecommendationItem(
            title="일정한 수면 스케줄 유지하기",
            description="매일 같은 시간에 화면을 끄고 취침 루틴을 지키면 늦은 밤 이탈을 줄일 수 있어요.",
            impact="높음",
        ),
        RecommendationItem(
            title="정기적인 휴식 취하기",
            description="짧은 집중 스프린트와 의도적인 휴식을 번갈아 사용하면 생산적인 세션을 지속할 수 있어요.",
            impact="보통",
        ),
        RecommendationItem(
            title="퇴근 전 내일 계획 세우기",
            description="자기 전에 다음날 핵심 할 일을 적어두면 아침 시작의 마찰이 줄어들어요.",
            impact="보통",
        ),
    ]

    if analysis.risky_patterns:
        recommendations[0] = RecommendationItem(
            title="가장 위험한 패턴 줄이기",
            description=analysis.risky_patterns[0].description,
            impact="높음" if analysis.risky_patterns[0].severity == "high" else "보통",
        )

    return recommendations


def _build_weekly_activity(logs: list[BehaviorLog]) -> list[WeeklyActivityItem]:
    grouped = defaultdict(list)
    for log in logs:
        grouped[log.created_at.weekday()].append(log)

    labels = ["월", "화", "수", "목", "금", "토", "일"]
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
        ("행동 30개 기록하기", len(logs), 30),
        ("20시간 공부하기", min(study_sessions * 4, 20), 20),
        ("운동 5회 하기", exercise_sessions, 5),
        ("오후 11시 전 취침하기", sleep_success, 7),
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
            title="첫 번째 주",
            description="7일 연속 행동을 기록했어요",
            unlocked=current_streak >= 7,
            icon="🎉",
        ),
        AchievementItem(
            title="아침형 인간",
            description="오전 8시 이전에 5일 시작했어요",
            unlocked=morning_positive >= 5,
            icon="🌅",
        ),
        AchievementItem(
            title="집중 마스터",
            description="하루 집중도 90% 이상 달성했어요",
            unlocked=best_focus.focus >= 85,
            icon="🎯",
        ),
        AchievementItem(
            title="꾸준함의 왕",
            description="30일 연속 기록 달성했어요",
            unlocked=current_streak >= 30,
            icon="👑",
        ),
        AchievementItem(
            title="자기 인식",
            description="인사이트 50개를 생성했어요",
            unlocked=len(all_logs) >= 50 and len(_build_analysis_insights(recent_logs, analysis)) >= 4,
            icon="🧠",
        ),
        AchievementItem(
            title="습관 파괴자",
            description="나쁜 습관을 50% 줄였어요",
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


def _build_profile_summary_title(current_streak: int, days_active: int, total_logs: int) -> str:
    if current_streak >= 14:
        return f"{current_streak}일 리듬을 유지하고 있어요."
    if current_streak >= 7:
        return f"{current_streak}일간 눈에 띄는 추진력이 생겼어요."
    if days_active >= 5:
        return "루틴이 안정되기 시작하고 있어요."
    if total_logs >= 1:
        return "패턴 지도가 만들어지고 있어요."
    return "리듬이 형성되고 있어요."


def _build_profile_summary_description(
    recent_logs: list[BehaviorLog],
    recent_tag_counter: Counter,
    best_hour: int,
) -> str:
    if not recent_logs:
        return "몇 가지 더 기록하면 Mindflow가 가장 강한 습관, 최적의 집중 시간대, 회복 패턴을 보여줄 거예요."

    top_tag, top_count = recent_tag_counter.most_common(1)[0]
    return (
        f"이번 주 가장 많은 패턴은 {top_tag} ({top_count}회)이며, "
        f"가장 강한 집중 시간대는 {_hour_range(best_hour)} 전후예요. "
        "작고 솔직한 기록을 계속 쌓아가세요."
    )


def _check_chat_rate_limit(user_id: int):
    key = f"rate:chat:{user_id}"
    count = redis_store.incr_with_ttl(key, CHAT_RATE_WINDOW)
    if count > CHAT_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="채팅 요청이 너무 많아요. 잠시 후 다시 시도해주세요.")
