from datetime import datetime
from typing import List

from pydantic import BaseModel


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


class AnalysisResponse(BaseModel):
    insights: List[InsightItem]
    behavior_distribution: List[BehaviorDistributionItem]
    weekly_pattern: List[RadarMetricItem]
    recommendations: List[RecommendationItem]


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
    stats: List[ProfileMetricItem]
    weekly_activity: List[WeeklyActivityItem]
    goals: List[GoalItem]
    achievements: List[AchievementItem]


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str


class ChatBootstrapResponse(BaseModel):
    intro: str
    suggested_prompts: List[str]
