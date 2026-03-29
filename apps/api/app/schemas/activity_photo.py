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
    tiny_thumbnail_url: str | None = None
    width: int
    height: int
    thumbnail_width: int
    thumbnail_height: int
    tiny_thumbnail_width: int | None = Field(default=None, ge=1)
    tiny_thumbnail_height: int | None = Field(default=None, ge=1)
    content_type: str
    original_filename: str | None
    gps_latitude: float | None = Field(default=None, ge=-90, le=90)
    gps_longitude: float | None = Field(default=None, ge=-180, le=180)
    created_at: datetime


class ActivityPhotoOrderUpdate(BaseModel):
    ordered_photo_ids: list[int] = Field(min_length=1)
