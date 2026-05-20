from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=3000)
    category: str = Field(default="general", pattern="^(general|tip|question|achievement)$")
    is_public: bool = True
    image_url: Optional[str] = None


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    content: Optional[str] = Field(None, min_length=1, max_length=3000)
    category: Optional[str] = Field(None, pattern="^(general|tip|question|achievement)$")
    is_public: Optional[bool] = None


class AuthorOut(BaseModel):
    id: int
    username: str
    model_config = {"from_attributes": True}


class PostOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    is_public: bool
    image_url: Optional[str]
    like_count: int
    comment_count: int
    created_at: datetime
    author: AuthorOut
    liked_by_me: bool = False
    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


class CommentOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    author: AuthorOut
    model_config = {"from_attributes": True}


class ChallengeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=2000)
    category: str = Field(default="habit", pattern="^(habit|fitness|focus|mindfulness|social)$")
    duration_days: int = Field(default=7, ge=1, le=90)


class ChallengeOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    duration_days: int
    is_official: bool
    participant_count: int
    created_at: datetime
    joined: bool = False
    my_streak: int = 0
    my_completed_days: int = 0
    model_config = {"from_attributes": True}


class CheckInResponse(BaseModel):
    message: str
    current_streak: int
    completed_days: int


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    completed_days: int
    current_streak: int
    is_completed: bool
    is_me: bool = False
    model_config = {"from_attributes": True}


class LeaderboardOut(BaseModel):
    challenge_id: int
    challenge_title: str
    duration_days: int
    entries: list[LeaderboardEntry]
    my_rank: Optional[int] = None
