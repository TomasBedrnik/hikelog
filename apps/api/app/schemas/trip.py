from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TripBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)

    # Rich page-like content (editor JSON). Keep flexible for now.
    content: dict[str, Any] | None = None

    start_date: date | None = None
    end_date: date | None = None

    # Optional default timezone (IANA name like "Europe/Lisbon")
    timezone: str | None = None

    # ISO country codes like ["PT", "ES"]
    country_codes: list[str] = Field(default_factory=list)

    planned_distance_m: int | None = Field(default=None, ge=0)
    planned_path_polyline: str | None = None
    show_planned_path: bool = False

    # Per-trip metrics config (empty object is fine)
    metrics_config: dict[str, Any] = Field(default_factory=dict)


class TripCreate(TripBase):
    """Request body for creating a trip."""

    pass


class TripUpdate(BaseModel):
    """
    PATCH-style update model: all fields optional.
    Use `exclude_unset=True` when applying updates.
    """

    name: str | None = Field(default=None, min_length=1, max_length=200)

    content: dict[str, Any] | None = None

    start_date: date | None = None
    end_date: date | None = None

    timezone: str | None = None
    country_codes: list[str] | None = None

    planned_distance_m: int | None = Field(default=None, ge=0)
    planned_path_polyline: str | None = None
    show_planned_path: bool | None = None

    metrics_config: dict[str, Any] | None = None


class TripRead(TripBase):
    """Response model."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
