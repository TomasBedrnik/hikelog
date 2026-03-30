from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.activity_comment import ActivityComment
    from app.models.activity_photo import ActivityPhoto
    from app.models.trip import Trip


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    strava_activity_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, unique=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    upload_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sport_type: Mapped[str | None] = mapped_column(String(32), nullable=True)

    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    moving_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    elapsed_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_elevation_gain: Mapped[float | None] = mapped_column(Float, nullable=True)

    description: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    polyline: Mapped[str | None] = mapped_column(String, nullable=True)
    summary_polyline: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="activities")
    photos: Mapped[list["ActivityPhoto"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
        order_by="ActivityPhoto.position.asc(), ActivityPhoto.created_at.asc(), ActivityPhoto.id.asc()",
    )
    comments: Mapped[list["ActivityComment"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
        order_by="ActivityComment.created_at.desc(), ActivityComment.id.desc()",
    )
