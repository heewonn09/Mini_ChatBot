from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"),
        case_sensitive=False,
    )

    # Database
    database_url: str = "sqlite:///./mini_chatbot.db"
    database_echo: bool = False

    # Auth
    jwt_secret_key: str = "change-this-in-production"

    # Google Gemini API
    google_api_key: str = ""

    # App Settings
    app_name: str = "Behavior Pattern Analysis Chatbot"
    app_env: str = "development"
    log_level: str = "INFO"

    # Risk analysis thresholds
    risk_negative_emotion_ratio_threshold: float = 40.0
    risk_negative_emotion_intensity_threshold: float = 6.0
    risk_mood_swing_threshold: float = 5.0
    risk_high_severity_ratio_threshold: float = 60.0




@lru_cache()
def get_settings() -> Settings:
    return Settings()
