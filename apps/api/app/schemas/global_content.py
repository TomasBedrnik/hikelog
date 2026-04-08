from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class GlobalContentUpdate(BaseModel):
    main_headline: str | None = Field(default=None, max_length=300)
    home_content: dict[str, Any] | None = None
    activity_photo_resize_long_side: int | None = Field(default=None, ge=1)


class GlobalContentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    main_headline: str | None
    home_content: dict[str, Any] | None
    hero_image_url: str | None
    hero_thumbnail_url: str | None
    hero_tiny_thumbnail_url: str | None = None
    hero_width: int | None = Field(default=None, ge=1)
    hero_height: int | None = Field(default=None, ge=1)
    hero_thumbnail_width: int | None = Field(default=None, ge=1)
    hero_thumbnail_height: int | None = Field(default=None, ge=1)
    hero_tiny_thumbnail_width: int | None = Field(default=None, ge=1)
    hero_tiny_thumbnail_height: int | None = Field(default=None, ge=1)
    activity_photo_resize_long_side: int = Field(ge=1)
    hero_content_type: str | None
    hero_original_filename: str | None
    created_at: datetime
    updated_at: datetime
