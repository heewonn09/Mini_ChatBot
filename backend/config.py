from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"),
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite:///./mini_chatbot.db"
    database_echo: bool = False

    # Auth
    jwt_secret_key: str = "mindflow-dev-secret-change-in-production"

    # Google Gemini API (required in production, optional in dev)
    google_api_key: str = ""

    # 추가 허용 오리진 (쉼표 구분, 예: https://my-app.vercel.app)
    allowed_origins: str = ""

    # App Settings
    app_name: str = "Behavior Pattern Analysis Chatbot"
    app_env: str = "development"
    log_level: str = "INFO"

    # SMTP (비밀번호 찾기 이메일 발송)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # 프론트엔드 URL (비밀번호 재설정 링크 생성용)
    frontend_url: str = "http://localhost:5173"

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        if self.app_env == "production":
            if not self.google_api_key:
                raise ValueError("GOOGLE_API_KEY must be set in production")
            if self.jwt_secret_key in ("change-this-in-production", "mindflow-dev-secret-change-in-production", ""):
                raise ValueError("JWT_SECRET_KEY must be changed in production")
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
