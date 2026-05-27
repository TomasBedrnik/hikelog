from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CommentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    text: str = Field(min_length=1, max_length=5000)

    @field_validator("name", "text")
    @classmethod
    def validate_non_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Value cannot be blank")
        return stripped


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    text: str
    created_at: datetime
