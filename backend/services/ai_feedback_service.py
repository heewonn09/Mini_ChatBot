import logging

from backend.config import get_settings
from backend.schemas.behavior import PatternAnalysisResult

logger = logging.getLogger(__name__)

# Current stable Gemini model (gemini-pro was deprecated March 2025)
_GEMINI_MODEL = "gemini-1.5-flash"


class AIFeedbackService:
    """Service for generating AI feedback using Gemini (with fallback)"""

    def __init__(self):
        self.model = None
        self.system_instruction = (
            "You are a professional behavioral analyst and psychologist assistant. "
            "Provide empathetic, constructive feedback based on behavior analysis data. "
            "Focus on positive reinforcement and actionable insights. "
            "Keep responses concise but meaningful."
        )
        try:
            import google.generativeai as genai
            settings = get_settings()
            if settings.google_api_key:
                genai.configure(api_key=settings.google_api_key)
                self.model = genai.GenerativeModel(_GEMINI_MODEL)
        except ImportError:
            logger.warning("google-generativeai package not installed; AI feedback disabled")
        except Exception as e:
            logger.warning("Google AI initialisation failed: %s", e)
            self.model = None
    
    def generate_feedback(self, analysis: PatternAnalysisResult) -> str:
        """
        Generate AI feedback based on pattern analysis results
        """
        if not self.model:
            # Fallback response when AI is not available
            total_logs = analysis.total_logs
            patterns = analysis.behavior_patterns
            trends = analysis.emotional_trends
            risks = analysis.risky_patterns

            response = f"Pattern Analysis Summary ({analysis.analysis_period_days} days, {total_logs} logs):\n\n"

            if patterns:
                response += "Key Emotional Patterns:\n"
                for pattern in patterns[:3]:  # Show top 3 patterns
                    response += f"- {pattern.emotion}: {pattern.count} entries ({pattern.percentage}%)\n"
                response += "\n"

            if trends:
                response += "Emotional Trends:\n"
                for trend in trends[:2]:  # Show top 2 trends
                    response += f"- {trend.emotion}: {trend.trend} trend\n"
                response += "\n"

            if risks:
                response += "Areas for Attention:\n"
                for risk in risks[:2]:  # Show top 2 risks
                    response += f"- {risk.pattern}: {risk.description}\n"
                response += "\n"

            response += "Recommendations:\n"
            response += "1. Continue tracking your emotional patterns\n"
            response += "2. Consider journaling about significant emotional events\n"
            response += "3. Practice mindfulness techniques for better emotional awareness\n\n"
            response += "Remember: Self-awareness is the first step toward positive change. Keep up the good work!"

            return response

        # Prepare analysis summary for the AI
        patterns_summary = "\n".join([
            f"- {p.emotion}: {p.count} entries ({p.percentage}%), avg intensity: {p.intensity_avg}/10"
            for p in analysis.behavior_patterns
        ])

        trends_summary = "\n".join([
            f"- {t.emotion}: {t.trend} trend, recent intensity: {t.recent_intensity}/10"
            for t in analysis.emotional_trends
        ]) if analysis.emotional_trends else "No trends detected"

        risks_summary = "\n".join([
            f"- {r.pattern} ({r.severity}): {r.description}"
            for r in analysis.risky_patterns
        ]) if analysis.risky_patterns else "No risky patterns detected"

        prompt = f"""
        {self.system_instruction}

        Analyze the following behavior pattern data from the last {analysis.analysis_period_days} days
        and provide constructive feedback to help the user understand their emotional patterns and behaviors.

        Total logs analyzed: {analysis.total_logs}

        Emotion Patterns:
        {patterns_summary}

        Emotional Trends:
        {trends_summary}

        Risk Factors:
        {risks_summary}

        Please provide:
        1. A summary of key observations
        2. Positive aspects or strengths you notice
        3. 2-3 actionable recommendations
        4. Encouraging closing statement

        Keep the response concise but meaningful (Max 300 words).
        """

        try:
            import google.generativeai as genai
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    candidate_count=1,
                    temperature=0.7,
                ),
            )
            return response.text.strip()
        except Exception as e:
            logger.error("Gemini generate_content failed: %s", e)
            return "AI feedback temporarily unavailable. Please try again later."

    def generate_chat_response(
        self,
        user_message: str,
        username: str,
        behavior_summary: str,
        conversation_memory: str,
        language: str = "en",
    ) -> str:
        """Generate a conversational AI reply to the user's message."""
        lang_instruction = (
            "항상 한국어로 답변하세요."
            if language == "ko"
            else "Always reply in English."
        )

        if not self.model:
            return (
                f"안녕하세요, {username}님! AI 어시스턴트가 현재 준비 중입니다."
                if language == "ko"
                else f"Hi {username}! The AI assistant is currently unavailable. Please check your API key."
            )

        prompt = (
            f"{self.system_instruction}\n"
            f"{lang_instruction}\n\n"
            f"User: {username}\n\n"
            f"Recent behavior summary:\n{behavior_summary}\n\n"
            f"Conversation so far:\n{conversation_memory if conversation_memory else '(none)'}\n\n"
            f"User message: {user_message}\n\n"
            "Respond directly and conversationally. Do not repeat the question or the behavior summary."
        )

        try:
            import google.generativeai as genai
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    candidate_count=1,
                    temperature=0.8,
                ),
            )
            return response.text.strip()
        except Exception as e:
            logger.error("Gemini chat failed: %s", e)
            return (
                "일시적으로 응답할 수 없습니다. 잠시 후 다시 시도해주세요."
                if language == "ko"
                else "I'm temporarily unable to respond. Please try again in a moment."
            )
