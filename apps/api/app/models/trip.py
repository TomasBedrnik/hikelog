from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.stage import Stage
    from app.models.trip_image import TripImage


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    country_codes: Mapped[list[str]] = mapped_column(
        ARRAY(String(2)),
        nullable=False,
        server_default=text("'{}'"),
    )
    planned_distance_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    planned_path_polyline: Mapped[str | None] = mapped_column(String, nullable=True)
    show_planned_path: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    zoom: Mapped[int | None] = mapped_column(Integer, nullable=True)
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

    stages: Mapped[list["Stage"]] = relationship(back_populates="trip", cascade="all, delete-orphan")
    activities: Mapped[list["Activity"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="Activity.start_date.desc(), Activity.created_at.desc(), Activity.id.desc()",
    )
    images: Mapped[list["TripImage"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripImage.position.asc(), TripImage.created_at.asc(), TripImage.id.asc()",
    )
