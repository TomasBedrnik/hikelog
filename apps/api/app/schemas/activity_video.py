from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ActivityVideoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_id: int
    position: int = Field(ge=0)
    original_video_url: str
    compressed_video_url: str | None = None
    thumbnail_url: str | None = None
    tiny_thumbnail_url: str | None = None
    width: int | None = Field(default=None, ge=1)
    height: int | None = Field(default=None, ge=1)
    duration_seconds: float | None = Field(default=None, ge=0)
    content_type: str
    original_filename: str | None
    gps_latitude: float | None = Field(default=None, ge=-90, le=90)
    gps_longitude: float | None = Field(default=None, ge=-180, le=180)
    capture_datetime_local: datetime | None = None
    timezone: str | None = None
    capture_datetime_utc: datetime | None = None
    capture_timezone_source: str | None = None
    capture_datetime_source: str | None = None
    gps_datetime_utc: datetime | None = None
    gps_timezone: str | None = None
    created_at: datetime


class ActivityVideoOrderUpdate(BaseModel):
    ordered_video_ids: list[int] = Field(min_length=1)
