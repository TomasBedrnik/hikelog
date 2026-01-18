from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Integer, String, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.stage import Stage


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Rich page-like content (block editor doc). Editor-specific JSON.
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Trip-level dates are calendar labels (no timezone conversion).
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Default timezone for displaying timestamps (optional).
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Countries spanned by the trip (ISO 3166-1 alpha-2 codes like "PT", "ES")
    country_codes: Mapped[list[str]] = mapped_column(
        ARRAY(String(2)),
        nullable=False,
        server_default=text("'{}'"),
    )

    # Planned route (optional)
    planned_distance_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    planned_path_polyline: Mapped[str | None] = mapped_column(
        String, nullable=True
    )  # TEXT on Postgres
    show_planned_path: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )

    # Per-trip custom metrics configuration (empty object = no metrics configured)
    metrics_config: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    stages: Mapped[list["Stage"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
    )
