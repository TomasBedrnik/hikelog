from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.trip import Trip


class Stage(Base):
    __tablename__ = "stages"

    id: Mapped[int] = mapped_column(primary_key=True)

    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Rich content for stage page
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Activity type (validate in API)
    activity_type: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # Encoded polyline (canonical geometry)
    path_polyline: Mapped[str] = mapped_column(String, nullable=False)

    # Absolute instants (UTC internally, tz-aware on input/output)
    start_date_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    end_date_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Fallback / display timezone (IANA name, optional)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Cached stats
    distance_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    moving_time_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    elapsed_time_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    elevation_gain_m: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Source tracking
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source_user_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Per-stage custom metric values
    metrics: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="stages")
