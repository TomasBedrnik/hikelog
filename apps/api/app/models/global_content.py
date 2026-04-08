from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GlobalContent(Base):
    __tablename__ = "global_contents"

    id: Mapped[int] = mapped_column(primary_key=True)
    main_headline: Mapped[str | None] = mapped_column(String(300), nullable=True)
    home_content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    hero_storage_path: Mapped[str | None] = mapped_column(String, nullable=True)
    hero_thumbnail_storage_path: Mapped[str | None] = mapped_column(String, nullable=True)
    hero_tiny_thumbnail_storage_path: Mapped[str | None] = mapped_column(String, nullable=True)
    hero_image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    hero_thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    hero_tiny_thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    hero_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hero_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hero_thumbnail_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hero_thumbnail_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hero_tiny_thumbnail_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hero_tiny_thumbnail_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hero_content_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    hero_original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    activity_photo_resize_long_side: Mapped[int] = mapped_column(Integer, nullable=False, default=1920)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
