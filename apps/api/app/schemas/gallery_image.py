from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GalleryImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    thumbnail_url: str
    width: int
    height: int
    thumbnail_width: int
    thumbnail_height: int
    content_type: str
    original_filename: str | None
    created_at: datetime
