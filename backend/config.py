from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./mini_chatbot.db"
    )
    database_echo: bool = os.getenv("DATABASE_ECHO", "False").lower() == "true"

    # Google Gemini API
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")

    # App Settings
    app_name: str = os.getenv("APP_NAME", "Behavior Pattern Analysis Chatbot")
    app_env: str = os.getenv("APP_ENV", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
