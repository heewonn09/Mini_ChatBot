from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from backend.models.behavior import BehaviorLog
from backend.schemas.behavior import PatternAnalysisResult
from backend.services.dashboard_service import DashboardService
from backend.utils.analysis_utils import (
    format_display_name,
    group_logs_by_hour,
    hour_range,
    is_negative,
    is_positive,
    ratio,
)

_COMPLEX_KEYWORDS = (
    "왜",
    "이유",
    "어떻게",
    "해결",
    "추천",
    "조언",
    "계획",
    "루틴",
    "개선",
    "고쳐",
    "도와",
    "비교",
)

_SUMMARY_KEYWORDS = ("분석", "요약", "정리", "패턴", "리포트")
_FOCUS_KEYWORDS = ("집중", "생산", "효율", "공부", "몰입")
_TIME_KEYWORDS = ("언제", "시간", "시간대", "몇 시", "타이밍")
_DISTRACTION_KEYWORDS = ("방해", "산만", "최악", "힘든 시간", "무너")
_EMOTION_KEYWORDS = ("감정", "기분", "정서")
_HABIT_KEYWORDS = ("습관", "활동", "태그")
_TOP_KEYWORDS = ("자주", "많이", "top", "뭐", "무엇", "어떤")
_STREAK_KEYWORDS = ("연속", "며칠", "스트릭", "streak", "꾸준")
_TODAY_KEYWORDS = ("오늘", "최근", "요즘", "방금")
_RISK_KEYWORDS = ("위험", "문제", "경고", "조심", "리스크")

_EMOTION_LABELS = {
    "happy": "기쁨",
    "focused": "집중",
    "calm": "안정",
    "motivated": "의욕",
    "neutral": "보통",
    "sad": "슬픔",
    "angry": "분노",
    "anxious": "불안",
    "stressed": "스트레스",
    "depressed": "우울",
}


@dataclass(slots=True)
class LocalChatContext:
    username: str
    logs: list[BehaviorLog]
    analysis: PatternAnalysisResult


class ChatIntentRouterService:
    """Answers simple data lookup questions directly from local app data."""

    @classmethod
    def try_answer(cls, message: str, context: LocalChatContext) -> str | None:
        normalized = cls._normalize(message)
        if not normalized:
            return None

        intent = cls._detect_intent(normalized)
        if intent is None:
            return None

        if not context.logs:
            return cls._no_logs_answer(context.username)

        if intent == "focus_time":
            return cls._answer_focus_time(context)
        if intent == "distraction_time":
            return cls._answer_distraction_time(context)
        if intent == "emotion":
            return cls._answer_emotion(context)
        if intent == "habit":
            return cls._answer_habit(context)
        if intent == "streak":
            return cls._answer_streak(context)
        if intent == "today":
            return cls._answer_today(context)
        if intent == "risk":
            return cls._answer_risk(context)
        if intent == "summary":
            return cls._answer_summary(context)
        return None

    @staticmethod
    def _normalize(message: str) -> str:
        return " ".join(message.lower().strip().split())

    @classmethod
    def _detect_intent(cls, message: str) -> str | None:
        if cls._contains_any(message, _FOCUS_KEYWORDS) and cls._contains_any(
            message, _TIME_KEYWORDS
        ):
            return "focus_time"
        if cls._contains_any(message, _DISTRACTION_KEYWORDS):
            return "distraction_time"
        if cls._contains_any(message, _STREAK_KEYWORDS):
            return "streak"
        if cls._contains_any(message, _TODAY_KEYWORDS):
            return "today"
        if cls._contains_any(message, _RISK_KEYWORDS):
            return "risk"
        if cls._contains_any(message, _SUMMARY_KEYWORDS) or (
            "습관" in message and not cls._contains_any(message, _COMPLEX_KEYWORDS)
        ):
            return "summary"
        if cls._contains_any(message, _EMOTION_KEYWORDS):
            return "emotion"
        if cls._contains_any(message, _HABIT_KEYWORDS) and cls._contains_any(
            message, _TOP_KEYWORDS
        ):
            return "habit"
        return None

    @staticmethod
    def _contains_any(message: str, keywords: tuple[str, ...]) -> bool:
        return any(keyword in message for keyword in keywords)

    @staticmethod
    def _no_logs_answer(username: str) -> str:
        display_name = format_display_name(username)
        return (
            f"{display_name}님 기록이 아직 많지 않아서 바로 분석할 패턴이 부족해요. "
            "행동 기록을 3~5개 정도 더 남겨주면 시간대, 감정, 자주 하는 활동을 바로 요약해드릴게요."
        )

    @classmethod
    def _answer_focus_time(cls, context: LocalChatContext) -> str:
        hour_groups = group_logs_by_hour(context.logs)
        best_hour = max(hour_groups, key=lambda hour: ratio(hour_groups[hour], is_positive))
        best_logs = hour_groups[best_hour]
        best_ratio = round(ratio(best_logs, is_positive) * 100)
        return (
            f"최근 기록 기준으로 가장 집중 비율이 높은 시간대는 {hour_range(best_hour)}예요. "
            f"이 구간 기록 {len(best_logs)}건 중 집중/긍정 패턴이 {best_ratio}%였어요. "
            "중요한 공부나 몰입이 필요한 일은 이 시간대에 먼저 배치해보세요."
        )

    @classmethod
    def _answer_distraction_time(cls, context: LocalChatContext) -> str:
        hour_groups = group_logs_by_hour(context.logs)
        worst_hour = max(hour_groups, key=lambda hour: ratio(hour_groups[hour], is_negative))
        worst_logs = hour_groups[worst_hour]
        worst_ratio = round(ratio(worst_logs, is_negative) * 100)
        return (
            f"최근 기록에서 가장 흔하게 흐트러진 시간대는 {hour_range(worst_hour)}예요. "
            f"이 구간 기록 {len(worst_logs)}건 중 방해 패턴이 {worst_ratio}%였어요. "
            "알림 차단이나 쉬는 시간 고정 같은 장치를 먼저 붙이면 효과를 보기 쉬워요."
        )

    @classmethod
    def _answer_emotion(cls, context: LocalChatContext) -> str:
        if not context.analysis.behavior_patterns:
            return cls._no_logs_answer(context.username)

        top = context.analysis.behavior_patterns[0]
        emotion_label = cls._format_emotion(top.emotion)
        return (
            f"최근 {context.analysis.analysis_period_days}일 기준으로 가장 자주 나온 감정은 {emotion_label}이에요. "
            f"전체 {context.analysis.total_logs}건 중 {top.count}건으로 {top.percentage:.0f}%를 차지했고, "
            f"평균 강도는 {top.intensity_avg:.1f}/10이었어요."
        )

    @classmethod
    def _answer_habit(cls, context: LocalChatContext) -> str:
        tag_counter = Counter(log.tag for log in context.logs if log.tag)
        if not tag_counter:
            return "아직 태그가 붙은 기록이 많지 않아서 자주 하는 활동을 정확히 집어내기 어려워요."

        top_three = tag_counter.most_common(3)
        summary = ", ".join(
            f"{cls._format_tag(tag)} {count}회" for tag, count in top_three
        )
        top_tag, top_count = top_three[0]
        return (
            f"가장 자주 기록한 활동은 {cls._format_tag(top_tag)}이고 총 {top_count}회였어요. "
            f"상위 활동을 보면 {summary} 순서예요."
        )

    @classmethod
    def _answer_streak(cls, context: LocalChatContext) -> str:
        current = DashboardService.current_streak(context.logs)
        longest = DashboardService.longest_streak(context.logs)
        return (
            f"현재 연속 기록은 {current}일이고, 지금까지 가장 길었던 연속 기록은 {longest}일이에요. "
            "하루에 한 줄만 남겨도 스트릭을 안정적으로 이어가기 쉬워요."
        )

    @classmethod
    def _answer_today(cls, context: LocalChatContext) -> str:
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
        recent_logs = [log for log in context.logs if log.created_at >= cutoff]
        if not recent_logs:
            return "최근 24시간 안에는 아직 새 행동 기록이 없어요."

        emotion_counter = Counter(cls._format_emotion(log.emotion) for log in recent_logs)
        tag_counter = Counter(cls._format_tag(log.tag) for log in recent_logs if log.tag)
        top_emotion, emotion_count = emotion_counter.most_common(1)[0]
        parts = [
            f"최근 24시간 기준으로 {len(recent_logs)}건을 기록했어요.",
            f"가장 많이 보인 감정은 {top_emotion} {emotion_count}건이에요.",
        ]
        if tag_counter:
            top_tag, tag_count = tag_counter.most_common(1)[0]
            parts.append(f"가장 많이 한 활동은 {top_tag} {tag_count}건이에요.")
        return " ".join(parts)

    @classmethod
    def _answer_risk(cls, context: LocalChatContext) -> str:
        if not context.analysis.risky_patterns:
            return "최근 기록에서는 뚜렷한 위험 패턴이 크게 잡히지 않았어요."

        top_risk = context.analysis.risky_patterns[0]
        severity = {"high": "높음", "medium": "보통", "low": "낮음"}.get(
            top_risk.severity, top_risk.severity
        )
        return (
            f"지금 가장 먼저 봐야 할 위험 신호는 {cls._format_pattern(top_risk.pattern)}이에요. "
            f"심각도는 {severity}이고, {top_risk.description} "
            "이 패턴이 반복되면 생활 리듬이나 유발 상황을 함께 점검해보는 게 좋아요."
        )

    @classmethod
    def _answer_summary(cls, context: LocalChatContext) -> str:
        top_pattern = context.analysis.behavior_patterns[0] if context.analysis.behavior_patterns else None
        top_emotion = cls._format_emotion(top_pattern.emotion) if top_pattern else "기록 부족"
        tag_counter = Counter(log.tag for log in context.logs if log.tag)
        top_tag, top_tag_count = tag_counter.most_common(1)[0] if tag_counter else ("기록 없음", 0)
        hour_groups = group_logs_by_hour(context.logs)
        best_hour = max(hour_groups, key=lambda hour: ratio(hour_groups[hour], is_positive))
        streak = DashboardService.current_streak(context.logs)

        lines = [
            f"빠르게 요약하면 최근 {context.analysis.analysis_period_days}일 동안 총 {context.analysis.total_logs}건을 기록했고 현재 {streak}일 연속 기록 중이에요.",
            f"가장 자주 나온 감정은 {top_emotion}이고, 가장 많이 한 활동은 {cls._format_tag(top_tag)} {top_tag_count}회예요.",
            f"집중 비율이 가장 높은 시간대는 {hour_range(best_hour)}예요.",
        ]
        if context.analysis.risky_patterns:
            lines.append(
                f"주의해서 볼 패턴은 {cls._format_pattern(context.analysis.risky_patterns[0].pattern)}예요."
            )
        return " ".join(lines)

    @staticmethod
    def _format_tag(tag: str | None) -> str:
        if not tag:
            return "기록 없음"
        return tag.replace("_", " ")

    @staticmethod
    def _format_pattern(pattern: str) -> str:
        return pattern.replace("_", " ")

    @staticmethod
    def _format_emotion(emotion: str | None) -> str:
        if not emotion:
            return "알 수 없음"
        return _EMOTION_LABELS.get(emotion.lower(), emotion.replace("_", " "))
