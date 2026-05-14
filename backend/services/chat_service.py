from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models.behavior import User
from backend.models.chat import ChatHistory, ChatSession
from backend.redis_client import redis_store
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
from backend.services.pattern_analysis_service import PatternAnalysisService

CHAT_RATE_LIMIT = 30
CHAT_RATE_WINDOW = 60

CHAT_SUGGESTIONS = [
    "왜 나는 생산적이지 않을까요?",
    "내 습관을 분석해줘",
    "어떻게 하면 더 집중할 수 있나요?",
    "공부하기 가장 좋은 시간대가 언제인가요?",
]


def _format_display_name(username: str) -> str:
    return username.replace("_", " ").title()


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
                    id=s.id,
                    title=s.title,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
                for s in sessions
            ]
        )

    def create_session(self, user_id: int) -> CreateSessionResponse:
        session = ChatSession(user_id=user_id, title="새 대화")
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
            user_id=user.id, days=7, db=self.db
        )
        top_emotion = (
            analysis.behavior_patterns[0].emotion
            if analysis.behavior_patterns
            else "습관"
        )
        name = _format_display_name(user.username)
        intro = (
            f"안녕하세요, {name}님! 저는 행동 분석 어시스턴트입니다. 최근 패턴을 분석했으며 "
            f"습관을 더 잘 이해할 수 있도록 도울 준비가 됐어요. 지금 가장 강한 신호는 '{top_emotion}'입니다."
        )
        history = (
            self.db.query(ChatHistory)
            .filter(ChatHistory.user_id == user.id)
            .order_by(ChatHistory.created_at.desc())
            .limit(6)
            .all()
        )
        if history:
            intro += " 최근 대화 내용도 기억하고 있어요."
        return ChatBootstrapResponse(intro=intro, suggested_prompts=CHAT_SUGGESTIONS)

    def send_message(
        self, user: User, message: str, session_id: int | None
    ) -> ChatResponse:
        self.check_rate_limit(user.id)

        if session_id:
            session = (
                self.db.query(ChatSession)
                .filter(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user.id,
                )
                .first()
            )
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
        else:
            session = ChatSession(user_id=user.id, title="새 대화")
            self.db.add(session)
            self.db.flush()
            session_id = session.id

        analysis = PatternAnalysisService.analyze_behaviors(
            user_id=user.id, days=14, db=self.db
        )
        behavior_summary = self.ai.generate_feedback(analysis)

        recent_messages = (
            self.db.query(ChatHistory)
            .filter(
                ChatHistory.user_id == user.id,
                ChatHistory.session_id == session_id,
            )
            .order_by(ChatHistory.created_at.desc())
            .limit(10)
            .all()
        )
        memory = "\n".join(
            f"{item.role}: {item.message}" for item in reversed(recent_messages)
        )

        try:
            answer = self.ai.generate_chat_response(
                user_message=message,
                username=_format_display_name(user.username),
                behavior_summary=behavior_summary,
                conversation_memory=memory,
            )
        except Exception:
            answer = "지금은 답변하지 못했어요. 잠시 후 다시 시도해주세요."

        if not recent_messages:
            session.title = message[:40] + ("..." if len(message) > 40 else "")

        self.db.add(
            ChatHistory(
                user_id=user.id,
                session_id=session_id,
                role="user",
                message=message,
                created_at=datetime.now(timezone.utc),
            )
        )
        self.db.add(
            ChatHistory(
                user_id=user.id,
                session_id=session_id,
                role="assistant",
                message=answer,
                created_at=datetime.now(timezone.utc),
            )
        )
        self.db.commit()
        return ChatResponse(answer=answer, session_id=session_id)

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
