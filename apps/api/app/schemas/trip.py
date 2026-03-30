from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.comment import CommentRead
from app.schemas.trip_image import TripImageRead


class TripBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    content: dict[str, Any] | None = None
    start_date: date | None = None
    end_date: date | None = None
    timezone: str | None = None
    country_codes: list[str] = Field(default_factory=list)
    planned_distance_m: int | None = Field(default=None, ge=0)
    planned_path_polyline: str | None = None
    show_planned_path: bool = False
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    zoom: int | None = Field(default=None, ge=0, le=19)
    metrics_config: dict[str, Any] = Field(default_factory=dict)


class TripCreate(TripBase):
    pass


class TripUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    content: dict[str, Any] | None = None
    start_date: date | None = None
    end_date: date | None = None
    timezone: str | None = None
    country_codes: list[str] | None = None
    planned_distance_m: int | None = Field(default=None, ge=0)
    planned_path_polyline: str | None = None
    show_planned_path: bool | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    zoom: int | None = Field(default=None, ge=0, le=19)
    metrics_config: dict[str, Any] | None = None


class TripRead(TripBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    map_card_image_url: str | None = None
    map_card_width: int | None = Field(default=None, ge=1)
    map_card_height: int | None = Field(default=None, ge=1)
    map_card_content_type: str | None = None
    created_at: datetime
    comments: list[CommentRead] = Field(default_factory=list)
    images: list[TripImageRead] = Field(default_factory=list)
