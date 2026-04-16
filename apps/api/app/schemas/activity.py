from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.activity_audio import ActivityAudioRead
from app.schemas.activity_photo import ActivityPhotoRead
from app.schemas.activity_video import ActivityVideoRead
from app.schemas.comment import CommentRead


class ActivityBase(BaseModel):
    trip_id: int
    strava_activity_id: int | None = None
    user_id: int | None = None
    upload_id: int | None = None
    external_id: str | None = Field(default=None, max_length=255)
    type: str | None = Field(default=None, max_length=32)
    sport_type: str | None = Field(default=None, max_length=32)
    start_date: datetime | None = None
    name: str = Field(min_length=1, max_length=200)
    distance: float | None = Field(default=None, ge=0)
    moving_time: int | None = Field(default=None, ge=0)
    elapsed_time: int | None = Field(default=None, ge=0)
    total_elevation_gain: float | None = Field(default=None, ge=0)
    description: dict[str, Any] | None = None
    polyline: str | None = None
    summary_polyline: str | None = None


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    trip_id: int | None = None
    strava_activity_id: int | None = None
    user_id: int | None = None
    upload_id: int | None = None
    external_id: str | None = Field(default=None, max_length=255)
    type: str | None = Field(default=None, max_length=32)
    sport_type: str | None = Field(default=None, max_length=32)
    start_date: datetime | None = None
    name: str | None = Field(default=None, min_length=1, max_length=200)
    distance: float | None = Field(default=None, ge=0)
    moving_time: int | None = Field(default=None, ge=0)
    elapsed_time: int | None = Field(default=None, ge=0)
    total_elevation_gain: float | None = Field(default=None, ge=0)
    description: dict[str, Any] | None = None
    polyline: str | None = None
    summary_polyline: str | None = None


class ActivityRead(ActivityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    trip_name: str | None = None
    comments: list[CommentRead] = Field(default_factory=list)
    photos: list[ActivityPhotoRead] = Field(default_factory=list)
    videos: list[ActivityVideoRead] = Field(default_factory=list)


class ActivityAdminRead(ActivityRead):
    audios: list[ActivityAudioRead] = Field(default_factory=list)


class ActivitySummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: int
    name: str
    type: str | None
    sport_type: str | None
    start_date: datetime | None
    distance: float | None
    moving_time: int | None
    elapsed_time: int | None
    total_elevation_gain: float | None
    description: dict[str, Any] | None = None
    summary_polyline: str | None = None
    photos: list[ActivityPhotoRead] = Field(default_factory=list)


class ActivityListItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: int
    name: str
    start_date: datetime | None
