from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

SUPPORTED_LANGUAGE_CODES = ("en", "cs")


class GlobalContentUpdate(BaseModel):
    main_headline: str | None = Field(default=None, max_length=300)
    home_content: dict[str, Any] | None = None
    enabled_language_codes: list[str] | None = None
    activity_photo_resize_long_side: int | None = Field(default=None, ge=1)
    activity_audio_transcription_language_code: str | None = Field(
        default=None, min_length=2, max_length=32
    )
    activity_audio_transcription_model: str | None = Field(
        default=None, min_length=1, max_length=64
    )
    activity_audio_transcription_enable_automatic_punctuation: bool | None = None
    activity_audio_transcription_profanity_filter: bool | None = None
    activity_audio_transcription_ai_prompt: str | None = None

    @field_validator("enabled_language_codes")
    @classmethod
    def validate_enabled_language_codes(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value

        enabled = []
        for language_code in value:
            normalized = language_code.strip().lower()
            if normalized not in SUPPORTED_LANGUAGE_CODES:
                raise ValueError("Unsupported language code")
            if normalized not in enabled:
                enabled.append(normalized)

        if not enabled:
            raise ValueError("At least one language must be enabled")

        return enabled


class GlobalContentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    main_headline: str | None
    home_content: dict[str, Any] | None
    enabled_language_codes: list[str]
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


class GlobalContentAdminRead(GlobalContentRead):
    activity_audio_transcription_language_code: str | None = None
    activity_audio_transcription_model: str
    activity_audio_transcription_enable_automatic_punctuation: bool
    activity_audio_transcription_profanity_filter: bool
    activity_audio_transcription_ai_prompt: str | None = None
