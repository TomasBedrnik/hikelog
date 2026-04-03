from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class StravaConnectionRead(BaseModel):
    connected: bool
    athlete_id: int | None
    username: str | None
    firstname: str | None
    lastname: str | None
    profile_medium: str | None
    scopes: list[str] = Field(default_factory=list)
    expires_at: datetime | None


class StravaAuthorizationRead(BaseModel):
    authorization_url: str


class StravaRecentActivityRead(BaseModel):
    id: int
    name: str
    sport_type: str | None
    start_date: datetime
    distance: float | None
    moving_time: int | None
    total_elevation_gain: float | None
