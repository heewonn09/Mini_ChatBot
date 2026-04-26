from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field, field_validator


# ============= User Schemas =============
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("Invalid email format")
        return value


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============= BehaviorLog Schemas =============
class BehaviorLogBase(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    emotion: str = Field(..., min_length=1, max_length=50)
    tag: Optional[str] = Field(None, max_length=100)
    intensity: float = Field(default=5.0, ge=1, le=10)
    created_at: Optional[datetime] = None


class BehaviorLogCreate(BehaviorLogBase):
    pass


class BehaviorLogUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, max_length=2000)
    emotion: Optional[str] = Field(None, min_length=1, max_length=50)
    tag: Optional[str] = Field(None, max_length=100)
    intensity: Optional[float] = Field(None, ge=1, le=10)


class BehaviorLogResponse(BehaviorLogBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class BehaviorLogWithUser(BehaviorLogResponse):
    user: UserResponse


# ============= Analysis Schemas =============
class BehaviorPattern(BaseModel):
    emotion: str
    count: int
    percentage: float
    intensity_avg: float


class EmotionalTrend(BaseModel):
    emotion: str
    trend: str  # increasing, decreasing, stable
    recent_intensity: float


class RiskyPattern(BaseModel):
    pattern: str
    description: str
    severity: str  # low, medium, high
    count: int


class PatternAnalysisResult(BaseModel):
    user_id: int
    analysis_period_days: int
    total_logs: int
    behavior_patterns: List[BehaviorPattern]
    emotional_trends: List[EmotionalTrend]
    risky_patterns: List[RiskyPattern]
    ai_feedback: str
    generated_at: datetime


class PatternAnalysisRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=90)


class WebhookSubscriptionBase(BaseModel):
    url: str = Field(..., min_length=5, max_length=500)
    event_type: str = Field(..., min_length=3, max_length=100)
    is_active: bool = True


class WebhookSubscriptionCreate(WebhookSubscriptionBase):
    pass


class WebhookSubscriptionResponse(WebhookSubscriptionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EventLogResponse(BaseModel):
    id: int
    user_id: int
    webhook_subscription_id: int | None = None
    event_type: str
    payload: dict[str, Any]
    status: str
    retry_count: int
    response_code: int | None = None
    error_message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class RiskEventResponse(BaseModel):
    id: int
    user_id: int
    event_type: str
    severity: str
    details: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
