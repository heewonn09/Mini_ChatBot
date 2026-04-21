from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List


# ============= User Schemas =============
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr


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
