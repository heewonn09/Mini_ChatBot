from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="../.env")  # 🔥 핵심

class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

settings = Settings()