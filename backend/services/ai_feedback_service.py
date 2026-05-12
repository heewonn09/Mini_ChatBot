import json
import logging
import urllib.error
import urllib.request

from backend.config import get_settings
from backend.schemas.behavior import PatternAnalysisResult

logger = logging.getLogger(__name__)

_GEMINI_MODEL = "gemini-2.0-flash"
_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{_GEMINI_MODEL}:generateContent"
)


def _call_gemini(api_key: str, prompt: str, temperature: float = 0.7) -> str:
    """Call Gemini REST API directly, avoiding the broken SDK dependency chain."""
    url = f"{_GEMINI_URL}?key={api_key}"
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "candidateCount": 1},
    }).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
    return result["candidates"][0]["content"]["parts"][0]["text"].strip()


class AIFeedbackService:
    """Service for generating AI feedback using Gemini REST API."""

    def __init__(self):
        self.api_key: str = ""
        self.system_instruction = (
            "You are a professional behavioral analyst and psychologist assistant. "
            "Provide empathetic, constructive feedback based on behavior analysis data. "
            "Focus on positive reinforcement and actionable insights. "
            "Keep responses concise but meaningful."
        )
        settings = get_settings()
        if settings.google_api_key:
            self.api_key = settings.google_api_key
        else:
            logger.warning("GOOGLE_API_KEY not set; AI feedback will use fallback text")

    def generate_feedback(self, analysis: PatternAnalysisResult) -> str:
        if not self.api_key:
            return self._fallback_feedback(analysis)

        patterns_summary = "\n".join([
            f"- {p.emotion}: {p.count} entries ({p.percentage}%), avg intensity: {p.intensity_avg}/10"
            for p in analysis.behavior_patterns
        ])
        trends_summary = "\n".join([
            f"- {t.emotion}: {t.trend} trend, recent intensity: {t.recent_intensity}/10"
            for t in analysis.emotional_trends
        ]) or "No trends detected"
        risks_summary = "\n".join([
            f"- {r.pattern} ({r.severity}): {r.description}"
            for r in analysis.risky_patterns
        ]) or "No risky patterns detected"

        prompt = (
            f"{self.system_instruction}\n\n"
            f"Analyze the following behavior pattern data from the last {analysis.analysis_period_days} days "
            "and provide constructive feedback.\n\n"
            f"Total logs: {analysis.total_logs}\n"
            f"Emotion Patterns:\n{patterns_summary}\n\n"
            f"Trends:\n{trends_summary}\n\n"
            f"Risk Factors:\n{risks_summary}\n\n"
            "Provide: (1) key observations, (2) positive aspects, (3) 2-3 recommendations, "
            "(4) encouraging closing. Max 300 words."
        )

        try:
            return _call_gemini(self.api_key, prompt, temperature=0.7)
        except Exception as e:
            logger.error("Gemini feedback failed: %s", e)
            return self._fallback_feedback(analysis)

    def generate_chat_response(
        self,
        user_message: str,
        username: str,
        behavior_summary: str,
        conversation_memory: str,
        language: str = "en",
    ) -> str:
        lang_instruction = (
            "항상 한국어로 답변하세요." if language == "ko" else "Always reply in English."
        )

        if not self.api_key:
            return (
                f"안녕하세요, {username}님! AI 어시스턴트가 현재 준비 중입니다. API 키를 확인해주세요."
                if language == "ko"
                else f"Hi {username}! The AI assistant is currently unavailable. Please check your API key."
            )

        prompt = (
            f"{self.system_instruction}\n"
            f"{lang_instruction}\n\n"
            f"User: {username}\n\n"
            f"Recent behavior summary:\n{behavior_summary}\n\n"
            f"Conversation so far:\n{conversation_memory or '(none)'}\n\n"
            f"User message: {user_message}\n\n"
            "Respond directly and conversationally. Do not repeat the question or the behavior summary."
        )

        try:
            return _call_gemini(self.api_key, prompt, temperature=0.8)
        except Exception as e:
            logger.error("Gemini chat failed: %s", e)
            return (
                "일시적으로 응답할 수 없습니다. 잠시 후 다시 시도해주세요."
                if language == "ko"
                else "I'm temporarily unable to respond. Please try again in a moment."
            )

    def _fallback_feedback(self, analysis: PatternAnalysisResult) -> str:
        total_logs = analysis.total_logs
        response = f"Pattern Analysis Summary ({analysis.analysis_period_days} days, {total_logs} logs):\n\n"

        if analysis.behavior_patterns:
            response += "Key Emotional Patterns:\n"
            for pattern in analysis.behavior_patterns[:3]:
                response += f"- {pattern.emotion}: {pattern.count} entries ({pattern.percentage}%)\n"
            response += "\n"

        if analysis.emotional_trends:
            response += "Emotional Trends:\n"
            for trend in analysis.emotional_trends[:2]:
                response += f"- {trend.emotion}: {trend.trend} trend\n"
            response += "\n"

        if analysis.risky_patterns:
            response += "Areas for Attention:\n"
            for risk in analysis.risky_patterns[:2]:
                response += f"- {risk.pattern}: {risk.description}\n"
            response += "\n"

        response += (
            "Recommendations:\n"
            "1. Continue tracking your emotional patterns\n"
            "2. Consider journaling about significant emotional events\n"
            "3. Practice mindfulness techniques for better emotional awareness\n\n"
            "Remember: Self-awareness is the first step toward positive change. Keep up the good work!"
        )
        return response
