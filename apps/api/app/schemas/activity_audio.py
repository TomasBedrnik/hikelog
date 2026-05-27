from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActivityAudioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_id: int
    audio_url: str
    content_type: str
    original_filename: str | None
    transcription_raw: str | None
    transcription_enhanced: str | None
    created_at: datetime
