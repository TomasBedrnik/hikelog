from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    thumbnail_storage_path: Mapped[str] = mapped_column(String, nullable=False)
    image_url: Mapped[str] = mapped_column(String, nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    thumbnail_width: Mapped[int] = mapped_column(Integer, nullable=False)
    thumbnail_height: Mapped[int] = mapped_column(Integer, nullable=False)
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
