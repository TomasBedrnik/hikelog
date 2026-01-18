from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class StageBase(BaseModel):
    name: str | None = Field(default=None, max_length=200)

    content: dict[str, Any] | None = None

    activity_type: str | None = Field(default=None, max_length=32)

    # You decided these are optional (some sources may not provide them)
    start_date_time: datetime | None = None
    end_date_time: datetime | None = None

    # Optional timezone string (IANA)
    timezone: str | None = None

    # Canonical geometry for display
    path_polyline: str

    # Cached stats
    distance_m: int | None = Field(default=None, ge=0)
    moving_time_s: int | None = Field(default=None, ge=0)
    elapsed_time_s: int | None = Field(default=None, ge=0)
    elevation_gain_m: int | None = Field(default=None, ge=0)

    # Source tracking
    source: str | None = Field(default=None, max_length=32)
    source_id: str | None = Field(default=None, max_length=128)
    source_user_id: str | None = Field(default=None, max_length=128)

    # Custom per-stage metrics
    metrics: dict[str, Any] = Field(default_factory=dict)


class StageCreate(StageBase):
    """Request body for creating a stage."""

    pass


class StageUpdate(BaseModel):
    """PATCH-style update model."""

    name: str | None = Field(default=None, max_length=200)
    content: dict[str, Any] | None = None
    activity_type: str | None = Field(default=None, max_length=32)

    start_date_time: datetime | None = None
    end_date_time: datetime | None = None
    timezone: str | None = None

    path_polyline: str | None = None

    distance_m: int | None = Field(default=None, ge=0)
    moving_time_s: int | None = Field(default=None, ge=0)
    elapsed_time_s: int | None = Field(default=None, ge=0)
    elevation_gain_m: int | None = Field(default=None, ge=0)

    source: str | None = Field(default=None, max_length=32)
    source_id: str | None = Field(default=None, max_length=128)
    source_user_id: str | None = Field(default=None, max_length=128)

    metrics: dict[str, Any] | None = None


class StageOut(StageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: int
    created_at: datetime
