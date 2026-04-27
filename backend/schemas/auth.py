from pydantic import BaseModel, Field


class UserLoginRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=100)
