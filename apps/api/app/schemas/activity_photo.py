from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ActivityPhotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_id: int
    position: int = Field(ge=0)
    image_url: str
    thumbnail_url: str
    width: int
    height: int
    thumbnail_width: int
    thumbnail_height: int
    content_type: str
    original_filename: str | None
    created_at: datetime


class ActivityPhotoOrderUpdate(BaseModel):
    ordered_photo_ids: list[int] = Field(min_length=1)
