from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.activity import Activity


class ActivityVideo(Base):
    __tablename__ = "activity_videos"

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("activities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    original_storage_path: Mapped[str] = mapped_column(String, nullable=False)
    compressed_storage_path: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_storage_path: Mapped[str | None] = mapped_column(String, nullable=True)
    tiny_thumbnail_storage_path: Mapped[str | None] = mapped_column(String, nullable=True)
    original_video_url: Mapped[str] = mapped_column(String, nullable=False)
    compressed_video_url: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    tiny_thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gps_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    gps_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    capture_datetime: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    activity: Mapped["Activity"] = relationship(back_populates="videos")
