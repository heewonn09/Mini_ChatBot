from typing import Optional

from sqlalchemy.orm import Session

from backend.models.preferences import UserPreferences


class PreferencesService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, user_id: int) -> UserPreferences:
        prefs = self.db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
        if not prefs:
            prefs = UserPreferences(user_id=user_id, language="ko", theme="light", notifications_enabled=True)
            self.db.add(prefs)
            self.db.commit()
            self.db.refresh(prefs)
        return prefs

    def update(self, user_id: int, language: Optional[str] = None,
               theme: Optional[str] = None,
               notifications_enabled: Optional[bool] = None) -> UserPreferences:
        prefs = self.get_or_create(user_id)
        if language is not None:
            prefs.language = language
        if theme is not None:
            prefs.theme = theme
        if notifications_enabled is not None:
            prefs.notifications_enabled = notifications_enabled
        self.db.commit()
        self.db.refresh(prefs)
        return prefs
