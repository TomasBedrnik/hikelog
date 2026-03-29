from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.trip import Trip


class TripImage(Base):
    __tablename__ = "trip_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    thumbnail_storage_path: Mapped[str] = mapped_column(String, nullable=False)
    tiny_thumbnail_storage_path: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url: Mapped[str] = mapped_column(String, nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String, nullable=False)
    tiny_thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    thumbnail_width: Mapped[int] = mapped_column(Integer, nullable=False)
    thumbnail_height: Mapped[int] = mapped_column(Integer, nullable=False)
    tiny_thumbnail_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tiny_thumbnail_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gps_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    gps_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="images")
