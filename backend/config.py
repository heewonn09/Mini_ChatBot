from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

class Settings(BaseSettings):
    # 기존 필드들 동일...

    class Config:
        env_file = Path(__file__).parent.parent / ".env"  # 수정
        case_sensitive = False

class Settings(BaseSettings):
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




@lru_cache()
def get_settings() -> Settings:
    return Settings()
