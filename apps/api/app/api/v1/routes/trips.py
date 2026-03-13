from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.admin_user import AdminUser
from app.models.trip import Trip
from app.schemas.trip import TripCreate, TripRead, TripUpdate

router = APIRouter()


def _to_trip_read(trip: Trip) -> TripRead:
    return TripRead.model_validate(trip)


@router.get("", response_model=list[TripRead])
async def list_trips(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TripRead]:
    stmt = select(Trip).order_by(Trip.start_date.desc().nullslast(), Trip.created_at.desc())
    trips = (await session.scalars(stmt)).all()
    return [_to_trip_read(trip) for trip in trips]


@router.post("", response_model=TripRead, status_code=status.HTTP_201_CREATED)
async def create_trip(
    payload: TripCreate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    trip = Trip(**payload.model_dump())
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return _to_trip_read(trip)


@router.get("/{trip_id}", response_model=TripRead)
async def get_trip(
    trip_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    trip = await session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return _to_trip_read(trip)


@router.patch("/{trip_id}", response_model=TripRead)
async def update_trip(
    trip_id: int,
    payload: TripUpdate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    trip = await session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(trip, field, value)

    await session.commit()
    await session.refresh(trip)
    return _to_trip_read(trip)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    trip = await session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    await session.delete(trip)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
