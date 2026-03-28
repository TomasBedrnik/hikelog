from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.trip import Trip
from app.schemas.trip import TripRead

router = APIRouter()


def _to_trip_read(trip: Trip) -> TripRead:
    return TripRead.model_validate(trip)


@router.get("", response_model=list[TripRead])
async def list_public_trips(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TripRead]:
    stmt = select(Trip).order_by(Trip.start_date.desc().nullslast(), Trip.created_at.desc())
    trips = (await session.scalars(stmt)).all()
    return [_to_trip_read(trip) for trip in trips]


@router.get("/{trip_id}", response_model=TripRead)
async def get_public_trip(
    trip_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    trip = await session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return _to_trip_read(trip)
