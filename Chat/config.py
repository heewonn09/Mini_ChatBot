from dotenv import load_dotenv
import os
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

settings = Settings()

print("KEY:", settings.GOOGLE_API_KEY)