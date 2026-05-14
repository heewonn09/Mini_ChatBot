from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class StatCard(BaseModel):
    title: str
    value: str
    subtitle: str | None = None
    trend: str | None = None


class TimelinePoint(BaseModel):
    label: str
    focus: float
    distraction: float


class EmotionTrendPoint(BaseModel):
    label: str
    productive: float
    distracted: float


class HabitFrequencyItem(BaseModel):
    tag: str
    count: int


class InsightItem(BaseModel):
    title: str
    description: str
    type: str


class BehaviorDistributionItem(BaseModel):
    label: str
    value: float
    category: str


class RadarMetricItem(BaseModel):
    label: str
    value: float


class RecommendationItem(BaseModel):
    title: str
    description: str
    impact: str


class RecentActivityItem(BaseModel):
    id: int
    text: str
    tag: str | None = None
    emotion: str
    created_at: datetime


class OverviewResponse(BaseModel):
    welcome_name: str
    stat_cards: List[StatCard]
    daily_timeline: List[TimelinePoint]
    emotion_trends: List[EmotionTrendPoint]
    habit_frequency: List[HabitFrequencyItem]
    insights: List[InsightItem]
    recent_activity: List[RecentActivityItem]


class AnalysisThresholds(BaseModel):
    negative_emotion_ratio_threshold: float
    negative_emotion_intensity_threshold: float
    mood_swing_threshold: float
    high_severity_ratio_threshold: float


class AnalysisResponse(BaseModel):
    insights: List[InsightItem]
    behavior_distribution: List[BehaviorDistributionItem]
    weekly_pattern: List[RadarMetricItem]
    recommendations: List[RecommendationItem]
    thresholds: AnalysisThresholds


class ProfileMetricItem(BaseModel):
    title: str
    value: str
    icon: str


class WeeklyActivityItem(BaseModel):
    label: str
    productive: int
    other: int


class GoalItem(BaseModel):
    title: str
    current: int
    total: int
    tone: str


class AchievementItem(BaseModel):
    title: str
    description: str
    unlocked: bool
    icon: str


class ProfileResponse(BaseModel):
    display_name: str
    member_since: str
    summary_title: str
    summary_description: str
    logged_today: bool
    stats: List[ProfileMetricItem]
    top_habits: List[HabitFrequencyItem]
    recent_activity: List[RecentActivityItem]
    weekly_activity: List[WeeklyActivityItem]
    goals: List[GoalItem]
    achievements: List[AchievementItem]


class HabitCorrelationItem(BaseModel):
    tag_a: str
    tag_b: str
    direction: str
    diff_pct: int
    description: str


class HabitCorrelationResponse(BaseModel):
    correlations: list[HabitCorrelationItem]


class FocusPredictionResponse(BaseModel):
    score: int
    label: str
    hour_range: str
    confidence: str


class WeeklyReportResponse(BaseModel):
    report: str
    week_label: str
    cached: bool


class HeatmapDayItem(BaseModel):
    date: str
    count: int
    dominant_emotion: str


class HeatmapResponse(BaseModel):
    days: List[HeatmapDayItem]


class ChatSessionItem(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class ChatSessionListResponse(BaseModel):
    sessions: List[ChatSessionItem]


class CreateSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime


class RenameSessionRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: Optional[int] = None


class ChatResponse(BaseModel):
    answer: str
    session_id: int


class ChatBootstrapResponse(BaseModel):
    intro: str
    suggested_prompts: List[str]


class ChatHistoryItem(BaseModel):
    role: str
    message: str
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    items: List[ChatHistoryItem]


class UserPreferencesResponse(BaseModel):
    language: str
    theme: str
    notifications_enabled: bool


class UpdatePreferencesRequest(BaseModel):
    language: Optional[str] = Field(default=None, pattern="^(ko|en)$")
    theme: Optional[str] = Field(default=None, pattern="^(light|dark)$")
    notifications_enabled: Optional[bool] = None
