from collections import Counter
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models.behavior import BehaviorLog, User
from backend.models.chat import ChatHistory, ChatSession
from backend.redis_client import redis_store
from backend.schemas.behavior import PatternAnalysisResult
from backend.schemas.ui import (
    ChatBootstrapResponse,
    ChatHistoryItem,
    ChatHistoryResponse,
    ChatResponse,
    ChatSessionItem,
    ChatSessionListResponse,
    CreateSessionResponse,
)
from backend.services.ai_feedback_service import AIFeedbackService
from backend.services.chat_intent_router_service import (
    ChatIntentRouterService,
    LocalChatContext,
)
from backend.services.dashboard_service import DashboardService
from backend.services.pattern_analysis_service import PatternAnalysisService
from backend.utils.analysis_utils import format_display_name as _format_display_name

CHAT_RATE_LIMIT = 30
CHAT_RATE_WINDOW = 60
DEFAULT_SESSION_TITLE = "새 대화"

CHAT_SUGGESTIONS = [
    "왜 나는 생산적이지 않을까요?",
    "내 습관을 분석해줘",
    "어떻게 하면 더 집중할 수 있나요?",
    "공부하기 가장 좋은 시간대가 언제인가요?",
]


class ChatService:
    def __init__(self, db: Session, ai_service: AIFeedbackService):
        self.db = db
        self.ai = ai_service

    def check_rate_limit(self, user_id: int) -> None:
        key = f"rate:chat:{user_id}"
        count = redis_store.incr_with_ttl(key, CHAT_RATE_WINDOW)
        if count > CHAT_RATE_LIMIT:
            raise HTTPException(
                status_code=429,
                detail="채팅 요청이 너무 많아요. 잠시 후 다시 시도해주세요.",
            )

    def list_sessions(self, user_id: int) -> ChatSessionListResponse:
        sessions = (
            self.db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .order_by(ChatSession.updated_at.desc())
            .all()
        )
        return ChatSessionListResponse(
            sessions=[
                ChatSessionItem(
                    id=session.id,
                    title=session.title,
                    created_at=session.created_at,
                    updated_at=session.updated_at,
                )
                for session in sessions
            ]
        )

    def create_session(self, user_id: int) -> CreateSessionResponse:
        session = ChatSession(user_id=user_id, title=DEFAULT_SESSION_TITLE)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return CreateSessionResponse(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
        )

    def delete_session(self, user_id: int, session_id: int) -> None:
        session = (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        self.db.delete(session)
        self.db.commit()

    def get_bootstrap(self, user: User) -> ChatBootstrapResponse:
        analysis = PatternAnalysisService.analyze_behaviors(
            user_id=user.id,
            days=7,
            db=self.db,
        )
        top_emotion = (
            analysis.behavior_patterns[0].emotion
            if analysis.behavior_patterns
            else "기록 없음"
        )
        name = _format_display_name(user.username)
        intro = (
            f"안녕하세요, {name}님. 행동 패턴을 함께 보는 채팅 어시스턴트예요. "
            f"최근 7일 기록을 바탕으로 지금 가장 자주 보이는 감정은 '{top_emotion}'이에요."
        )
        history = (
            self.db.query(ChatHistory)
            .filter(ChatHistory.user_id == user.id)
            .order_by(ChatHistory.created_at.desc())
            .limit(6)
            .all()
        )
        if history:
            intro += " 최근 대화 흐름도 함께 참고해서 이어서 도와드릴게요."
        return ChatBootstrapResponse(intro=intro, suggested_prompts=CHAT_SUGGESTIONS)

    def send_message(
        self,
        user: User,
        message: str,
        session_id: int | None,
    ) -> ChatResponse:
        self.check_rate_limit(user.id)

        session = self._get_or_create_session(user.id, session_id)
        session_id = session.id

        analysis = self._get_cached_analysis(user.id)
        recent_messages = self._load_recent_messages(user.id, session_id)
        memory = "\n".join(
            f"{item.role}: {item.message}" for item in reversed(recent_messages)
        )
        logs = self._load_recent_logs(user.id)

        recent_log_details = [
            {
                "created_at": log.created_at.isoformat() if log.created_at else "",
                "tag": log.tag or "",
                "emotion": log.emotion or "",
                "intensity": log.intensity or 0,
                "text": (log.text or "")[:80],
                "notes": (getattr(log, "notes", None) or "")[:60],
            }
            for log in logs[:15]
        ]
        tag_counts = Counter(log.tag for log in logs if log.tag)
        top_tags = [
            {"tag": tag, "count": count}
            for tag, count in tag_counts.most_common(5)
        ]
        emotion_distribution = [
            {
                "emotion": pattern.emotion,
                "pct": round(pattern.percentage, 1),
                "intensity": round(pattern.intensity_avg, 1),
            }
            for pattern in analysis.behavior_patterns[:4]
        ]
        user_context = {
            "top_emotion": (
                analysis.behavior_patterns[0].emotion
                if analysis.behavior_patterns
                else None
            ),
            "streak_days": DashboardService.current_streak(logs),
            "total_logs": analysis.total_logs,
            "recent_logs": recent_log_details,
            "top_tags": top_tags,
            "emotion_distribution": emotion_distribution,
        }
        behavior_summary = self._build_behavior_summary(analysis)

        local_answer = ChatIntentRouterService.try_answer(
            message=message,
            context=LocalChatContext(
                username=user.username,
                logs=logs,
                analysis=analysis,
            ),
        )

        if local_answer is not None:
            answer = local_answer
        else:
            try:
                answer = self.ai.generate_chat_response(
                    user_message=message,
                    username=_format_display_name(user.username),
                    behavior_summary=behavior_summary,
                    conversation_memory=memory,
                    user_context=user_context,
                )
            except Exception:
                answer = "지금은 답변을 불러오지 못했어요. 잠시 후 다시 시도해주세요."

        if not recent_messages:
            session.title = message[:40] + ("..." if len(message) > 40 else "")

        self._save_messages(user.id, session_id, message, answer)
        self.db.query(ChatSession).filter(ChatSession.id == session_id).update(
            {"message_count": ChatSession.message_count + 2}
        )
        self.db.commit()
        return ChatResponse(answer=answer, session_id=session_id)

    def rename_session(
        self,
        user_id: int,
        session_id: int,
        title: str,
    ) -> ChatSessionItem:
        session = (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        session.title = title[:100]
        self.db.commit()
        self.db.refresh(session)
        return ChatSessionItem(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    def get_history(
        self,
        user_id: int,
        session_id: int | None,
        limit: int,
        offset: int,
    ) -> ChatHistoryResponse:
        query = self.db.query(ChatHistory).filter(ChatHistory.user_id == user_id)
        if session_id is not None:
            query = query.filter(ChatHistory.session_id == session_id)
        rows = (
            query.order_by(ChatHistory.created_at.asc())
            .offset(offset)
            .limit(min(limit, 100))
            .all()
        )
        return ChatHistoryResponse(
            items=[
                ChatHistoryItem(
                    role=row.role,
                    message=row.message,
                    created_at=row.created_at,
                )
                for row in rows
            ]
        )

    def _get_or_create_session(
        self,
        user_id: int,
        session_id: int | None,
    ) -> ChatSession:
        if session_id:
            session = (
                self.db.query(ChatSession)
                .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
                .first()
            )
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            return session

        session = ChatSession(user_id=user_id, title=DEFAULT_SESSION_TITLE)
        self.db.add(session)
        self.db.flush()
        return session

    def _get_cached_analysis(self, user_id: int) -> PatternAnalysisResult:
        cache_key = f"chat_analysis:{user_id}:14"
        cached = redis_store.get_json(cache_key)
        if cached:
            return PatternAnalysisResult(**cached)

        analysis = PatternAnalysisService.analyze_behaviors(
            user_id=user_id,
            days=14,
            db=self.db,
        )
        redis_store.set_json(
            cache_key,
            analysis.model_dump(mode="json"),
            ex_seconds=300,
        )
        return analysis

    def _load_recent_messages(
        self,
        user_id: int,
        session_id: int,
    ) -> list[ChatHistory]:
        return (
            self.db.query(ChatHistory)
            .filter(
                ChatHistory.user_id == user_id,
                ChatHistory.session_id == session_id,
            )
            .order_by(ChatHistory.created_at.desc())
            .limit(10)
            .all()
        )

    def _load_recent_logs(self, user_id: int) -> list[BehaviorLog]:
        return (
            self.db.query(BehaviorLog)
            .filter(BehaviorLog.user_id == user_id)
            .order_by(BehaviorLog.created_at.desc())
            .limit(200)
            .all()
        )

    def _build_behavior_summary(self, analysis: PatternAnalysisResult) -> str:
        if not analysis.behavior_patterns:
            return "최근 행동 기록이 아직 충분하지 않습니다."

        top = analysis.behavior_patterns[0]
        summary = (
            f"최근 14일 행동 분석: 총 {analysis.total_logs}건 기록. "
            f"주요 감정은 {top.emotion}이며 비중은 {top.percentage:.0f}%, "
            f"평균 강도는 {top.intensity_avg:.1f}/10입니다. "
        )
        if len(analysis.behavior_patterns) > 1:
            others = ", ".join(
                pattern.emotion for pattern in analysis.behavior_patterns[1:3]
            )
            summary += f"그다음으로 많이 보인 감정은 {others}입니다."
        return summary

    def _save_messages(
        self,
        user_id: int,
        session_id: int,
        user_message: str,
        answer: str,
    ) -> None:
        now = datetime.now(timezone.utc)
        self.db.add(
            ChatHistory(
                user_id=user_id,
                session_id=session_id,
                role="user",
                message=user_message,
                created_at=now,
            )
        )
        self.db.add(
            ChatHistory(
                user_id=user_id,
                session_id=session_id,
                role="assistant",
                message=answer,
                created_at=now,
            )
        )
        self.db.commit()
