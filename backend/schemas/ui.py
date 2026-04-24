from datetime import datetime
from pydantic import BaseModel
from typing import List


class StatCard(BaseModel):
    title: str
    value: str
    subtitle: str
    trend: str


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


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str
