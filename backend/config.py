from pydantic_settings import BaseSettings
from functools import lru_cache


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

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
