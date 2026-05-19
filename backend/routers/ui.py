import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from fastapi.responses import Response
from backend.auth import require_same_user
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.behavior import BehaviorLog, User
from backend.services.export_service import ExportService
from backend.services.notification_service import NotificationService
from backend.services.preferences_service import PreferencesService
from backend.schemas.ui import (
    AnalysisResponse,
    ChatBootstrapResponse,
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    ChatSessionItem,
    ChatSessionListResponse,
    CreateSessionResponse,
    HabitFrequencyItem,
    FocusPredictionResponse,
    HabitCorrelationItem,
    HabitCorrelationResponse,
    HeatmapDayItem,
    HeatmapResponse,
    InsightItem,
    RenameSessionRequest,
    UpdatePreferencesRequest,
    UserPreferencesResponse,
    NotificationOut,
    NotificationListResponse,
    WeeklyReportResponse,
    OverviewResponse,
    ProfileMetricItem,
    ProfileResponse,
    RecentActivityItem,
    StatCard,
)
from backend.services.ai_feedback_service import AIFeedbackService
from backend.services.chat_service import ChatService
from backend.services.dashboard_service import DashboardService
from backend.services.pattern_analysis_service import PatternAnalysisService
from backend.redis_client import redis_store
from backend.utils.analysis_utils import (
    dominant_emotion_label as _dominant_emotion_label,
    format_display_name as _format_display_name,
    get_hour_bin as _get_hour_bin,
    group_logs_by_hour as _group_logs_by_hour,
    hour_range as _hour_range,
    is_positive as _is_positive,
    ratio as _ratio,
)

router = APIRouter(prefix="/api/ui", tags=["UI"])
ai_service = AIFeedbackService()

_CORR_MIN_DAYS = 3   # 상관관계 계산 최소 활성 날짜 수 (focus_prediction 가드와 통일)
_CORR_MIN_DIFF = 15  # 보고 가치 있는 최소 퍼센트포인트 차이


@router.get("/{user_id}/overview", response_model=OverviewResponse)
def get_overview(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _cache_key = f"ui:overview:{user_id}"
    _cached = redis_store.get_json(_cache_key)
    if _cached:
        return OverviewResponse(**_cached)

    user = _get_user(user_id, db)
    logs = _get_logs(user_id, db, days=30, ascending=True)

    if not logs:
        _resp = OverviewResponse(
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
            daily_timeline=DashboardService.build_timeline([]),
            emotion_trends=DashboardService.build_weekday_trends([]),
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
        redis_store.set_json(_cache_key, _resp.model_dump(mode="json"), ex_seconds=300)
        return _resp

    # stat_cards / charts use 7-day subset; recent_activity uses full 30 days
    _cutoff_7d = datetime.now() - timedelta(days=7)
    logs_7d = [l for l in logs if (l.created_at.replace(tzinfo=None) if l.created_at.tzinfo else l.created_at) >= _cutoff_7d]
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)
    tag_counter = Counter(log.tag or "기타" for log in logs_7d) or Counter(log.tag or "기타" for log in logs)
    most_tag, most_count = tag_counter.most_common(1)[0]

    _resp = OverviewResponse(
        welcome_name=_format_display_name(user.username),
        stat_cards=DashboardService.build_stat_cards(logs_7d or logs, most_tag, most_count),
        daily_timeline=DashboardService.build_timeline(logs_7d or logs),
        emotion_trends=DashboardService.build_weekday_trends(logs),
        habit_frequency=[HabitFrequencyItem(tag=tag, count=count) for tag, count in tag_counter.most_common(6)],
        insights=DashboardService.build_analysis_insights(logs_7d or logs, analysis),
        recent_activity=[
            RecentActivityItem(
                id=log.id,
                text=log.text,
                tag=log.tag,
                emotion=log.emotion,
                created_at=log.created_at,
            )
            for log in sorted(logs, key=lambda item: item.created_at, reverse=True)[:20]
        ],
    )
    redis_store.set_json(_cache_key, _resp.model_dump(mode="json"), ex_seconds=300)
    return _resp


@router.get("/{user_id}/habit-correlations", response_model=HabitCorrelationResponse)
def get_habit_correlations(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    logs = _get_logs(user_id, db, days=30, ascending=True)

    if not logs:
        return HabitCorrelationResponse(correlations=[])

    by_date: dict = defaultdict(list)
    for log in logs:
        by_date[log.created_at.date()].append(log)

    tags = list({log.tag for log in logs if log.tag})
    if len(tags) < 2:
        return HabitCorrelationResponse(correlations=[])

    all_dates = set(by_date.keys())
    found: list[HabitCorrelationItem] = []

    for tag_a in tags:
        active_dates = {d for d, day_logs in by_date.items() if any(l.tag == tag_a for l in day_logs)}
        if len(active_dates) < _CORR_MIN_DAYS:
            continue
        baseline_dates = all_dates - active_dates

        for tag_b in tags:
            if tag_b == tag_a:
                continue
            b_active = [l for d in active_dates for l in by_date[d] if l.tag == tag_b]
            if len(b_active) < 2:
                continue
            b_baseline = [l for d in baseline_dates for l in by_date[d] if l.tag == tag_b]
            active_ratio = _ratio(b_active, _is_positive)
            baseline_ratio = _ratio(b_baseline, _is_positive) if b_baseline else 0.5
            diff = round((active_ratio - baseline_ratio) * 100)
            if abs(diff) < _CORR_MIN_DIFF:
                continue
            direction = "positive" if diff > 0 else "negative"
            description = (
                f"{tag_a}한 날은 {tag_b} 집중도가 {diff}% 높아요"
                if diff > 0
                else f"{tag_a}한 날은 {tag_b} 집중도가 {-diff}% 낮아요"
            )
            found.append(HabitCorrelationItem(
                tag_a=tag_a, tag_b=tag_b,
                direction=direction, diff_pct=abs(diff),
                description=description,
            ))

    found.sort(key=lambda x: x.diff_pct, reverse=True)
    return HabitCorrelationResponse(correlations=found[:4])


@router.get("/{user_id}/focus-prediction", response_model=FocusPredictionResponse)
def get_focus_prediction(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    logs = _get_logs(user_id, db, days=30, ascending=True)

    now = datetime.now(timezone.utc)
    current_bin = _get_hour_bin(now.hour)
    current_weekday = now.weekday()

    slot_logs = [
        log for log in logs
        if log.created_at.weekday() == current_weekday
        and _get_hour_bin(log.created_at.hour) == current_bin
    ]

    hr = _hour_range(current_bin)

    if len(slot_logs) < 3:
        return FocusPredictionResponse(
            score=50,
            label="이 시간대 데이터가 아직 부족해요. 계속 기록해보세요!",
            hour_range=hr,
            confidence="low",
        )

    score = round(_ratio(slot_logs, _is_positive) * 100)

    if score >= 75:
        label = "지금 집중하기 최고예요!"
    elif score >= 55:
        label = "집중하기 좋은 시간이에요."
    elif score >= 35:
        label = "보통 수준의 집중력이 예상돼요."
    else:
        label = "이 시간대는 방해 요소가 많은 편이에요."

    return FocusPredictionResponse(
        score=score,
        label=label,
        hour_range=hr,
        confidence="high",
    )


@router.get("/{user_id}/weekly-report", response_model=WeeklyReportResponse)
def get_weekly_report(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    now = datetime.now(timezone.utc)
    year, week, weekday = now.isocalendar()
    cache_key = f"weekly_report:{user_id}:{year}:{week}"
    week_label = f"{year}년 {week}주차"

    cached_report = redis_store.get_json(cache_key)
    if cached_report:
        return WeeklyReportResponse(report=cached_report, week_label=week_label, cached=True)

    if weekday != 1:
        return WeeklyReportResponse(report="", week_label=week_label, cached=False)

    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)
    behavior_summary = ai_service.generate_feedback(analysis)
    report = ai_service.generate_weekly_report(
        username=_format_display_name(user.username),
        behavior_summary=behavior_summary,
    )
    redis_store.set_json(cache_key, report, ex_seconds=7 * 24 * 3600)
    return WeeklyReportResponse(report=report, week_label=week_label, cached=False)


@router.get("/{user_id}/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    logs = _get_logs(user_id, db, days=90, ascending=True)
    grouped: dict[str, list[BehaviorLog]] = defaultdict(list)
    for log in logs:
        grouped[log.created_at.date().isoformat()].append(log)

    today = datetime.now().date()
    return HeatmapResponse(
        days=[
            HeatmapDayItem(
                date=(d := today - timedelta(days=i)).isoformat(),
                count=len(grouped.get(d.isoformat(), [])),
                dominant_emotion=_dominant_emotion_label(grouped.get(d.isoformat(), [])),
            )
            for i in range(89, -1, -1)
        ]
    )


@router.get("/{user_id}/analysis", response_model=AnalysisResponse)
def get_analysis_view(
    user_id: int,
    days: int = Query(default=7, ge=1, le=90),
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    logs = _get_logs(user_id, db, days=days, ascending=True)
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=days, db=db)

    return AnalysisResponse(
        insights=DashboardService.build_analysis_insights(logs, analysis),
        behavior_distribution=DashboardService.build_behavior_distribution(logs),
        weekly_pattern=DashboardService.build_weekly_pattern(logs),
        recommendations=DashboardService.build_recommendations(logs, analysis),
    )


@router.get("/{user_id}/profile", response_model=ProfileResponse)
def get_profile_view(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    all_logs = _get_logs(user_id, db, days=365, ascending=True)
    _cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)
    recent_logs = [log for log in all_logs if log.created_at >= _cutoff]
    analysis = PatternAnalysisService.analyze_behaviors(user_id=user_id, days=7, db=db)
    days_active = len({log.created_at.date() for log in all_logs})
    current_streak = DashboardService.current_streak(all_logs)
    longest = DashboardService.longest_streak(all_logs)
    today = datetime.now(timezone.utc).date()
    logged_today = any(log.created_at.date() == today for log in all_logs)
    recent_tag_counter = Counter(log.tag or "기타" for log in recent_logs)
    morning_positive = len(
        [log for log in recent_logs if 6 <= log.created_at.hour < 12 and _is_positive(log)]
    )
    focus_groups = _group_logs_by_hour(recent_logs)
    best_hour = max(focus_groups, key=lambda h: _ratio(focus_groups[h], _is_positive))

    return ProfileResponse(
        display_name=_format_display_name(user.username),
        member_since=user.created_at.strftime("%Y-%m-01"),
        summary_title=DashboardService.build_profile_summary_title(current_streak, days_active, len(all_logs)),
        summary_description=DashboardService.build_profile_summary_description(
            recent_logs=recent_logs,
            recent_tag_counter=recent_tag_counter,
            best_hour=best_hour,
        ),
        logged_today=logged_today,
        stats=[
            ProfileMetricItem(title="총 행동 수", value=str(len(all_logs)), icon="check"),
            ProfileMetricItem(title="활동 일수", value=str(days_active), icon="calendar"),
            ProfileMetricItem(title="현재 연속 기록", value=f"{current_streak}일", icon="flame"),
            ProfileMetricItem(title="최장 기록", value=f"{longest}일", icon="trophy"),
            ProfileMetricItem(
                title="생성된 인사이트",
                value=str(len(DashboardService.build_analysis_insights(recent_logs, analysis))),
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
        weekly_activity=DashboardService.build_weekly_activity(recent_logs),
        goals=DashboardService.build_goals(recent_logs),
        achievements=DashboardService.build_achievements(
            all_logs=all_logs,
            recent_logs=recent_logs,
            morning_positive=morning_positive,
            current_streak=current_streak,
            analysis=analysis,
        ),
    )


@router.get("/{user_id}/chat/sessions", response_model=ChatSessionListResponse)
def list_chat_sessions(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    return ChatService(db, ai_service).list_sessions(user_id)


@router.post("/{user_id}/chat/sessions", response_model=CreateSessionResponse, status_code=201)
def create_chat_session(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    return ChatService(db, ai_service).create_session(user_id)


@router.delete("/{user_id}/chat/sessions/{session_id}", status_code=204)
def delete_chat_session(
    user_id: int,
    session_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    ChatService(db, ai_service).delete_session(user_id, session_id)


@router.patch("/{user_id}/chat/sessions/{session_id}", response_model=ChatSessionItem)
def rename_chat_session(
    user_id: int,
    session_id: int,
    payload: RenameSessionRequest,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    return ChatService(db, ai_service).rename_session(user_id, session_id, payload.title)


@router.get("/{user_id}/chat/bootstrap", response_model=ChatBootstrapResponse)
def get_chat_bootstrap(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    return ChatService(db, ai_service).get_bootstrap(user)


@router.post("/{user_id}/chat", response_model=ChatResponse)
def chat_with_assistant(
    user_id: int,
    payload: ChatRequest,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    return ChatService(db, ai_service).send_message(user, payload.message, payload.session_id)


@router.get("/{user_id}/chat/history", response_model=ChatHistoryResponse)
def get_chat_history(
    user_id: int,
    session_id: Optional[int] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    return ChatService(db, ai_service).get_history(user_id, session_id, limit, offset)


@router.get("/{user_id}/preferences", response_model=UserPreferencesResponse)
def get_preferences(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    prefs = PreferencesService(db).get_or_create(user_id)
    return UserPreferencesResponse(
        language=prefs.language,
        theme=prefs.theme,
        notifications_enabled=prefs.notifications_enabled,
    )


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=1, max_length=50)


@router.patch("/{user_id}/profile")
def update_profile(
    user_id: int,
    payload: UpdateProfileRequest,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    if payload.username is not None:
        username = payload.username.strip()
        if not username:
            raise HTTPException(status_code=422, detail="사용자 이름을 입력해주세요.")
        user.username = username
        db.commit()
        db.refresh(user)
    return {"id": user.id, "username": user.username, "email": user.email}


@router.patch("/{user_id}/preferences", response_model=UserPreferencesResponse)
def update_preferences(
    user_id: int,
    payload: UpdatePreferencesRequest,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    prefs = PreferencesService(db).update(
        user_id,
        language=payload.language,
        theme=payload.theme,
        notifications_enabled=payload.notifications_enabled,
    )
    return UserPreferencesResponse(
        language=prefs.language,
        theme=prefs.theme,
        notifications_enabled=prefs.notifications_enabled,
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


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/{user_id}/notifications", response_model=NotificationListResponse)
def list_notifications(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    svc = NotificationService(db)
    items = svc.list_all(user_id)
    unread = sum(1 for n in items if not n.is_read)
    return NotificationListResponse(items=items, unread_count=unread)


@router.patch("/{user_id}/notifications/{notif_id}", response_model=NotificationOut)
def mark_notification_read(
    user_id: int,
    notif_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    return NotificationService(db).mark_read(user_id, notif_id)


@router.post("/{user_id}/notifications/read-all", status_code=204)
def mark_all_notifications_read(
    user_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    NotificationService(db).mark_all_read(user_id)


# ── Export ────────────────────────────────────────────────────────────────────

@router.get("/{user_id}/export")
def export_behaviors(
    user_id: int,
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    svc = ExportService(db)
    if format == "json":
        data = json.dumps(svc.export_behaviors_json(user_id), ensure_ascii=False, indent=2)
        return Response(content=data, media_type="application/json",
                        headers={"Content-Disposition": "attachment; filename=behaviors.json"})
    csv_data = svc.export_behaviors_csv(user_id)
    return Response(content=csv_data, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=behaviors.csv"})


@router.get("/{user_id}/chat/sessions/{session_id}/export")
def export_chat_session(
    user_id: int,
    session_id: int,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    md = ExportService(db).export_chat_markdown(user_id, session_id)
    return Response(content=md, media_type="text/markdown",
                    headers={"Content-Disposition": f"attachment; filename=chat_{session_id}.md"})


