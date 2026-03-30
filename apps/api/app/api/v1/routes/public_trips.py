from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models.trip import Trip
from app.models.trip_comment import TripComment
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.trip import TripRead

router = APIRouter()


def _to_trip_read(trip: Trip) -> TripRead:
    return TripRead.model_validate(trip)


@router.get("", response_model=list[TripRead])
async def list_public_trips(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TripRead]:
    stmt = (
        select(Trip)
        .options(selectinload(Trip.comments), selectinload(Trip.images))
        .order_by(Trip.start_date.desc().nullslast(), Trip.created_at.desc())
    )
    trips = (await session.scalars(stmt)).all()
    return [_to_trip_read(trip) for trip in trips]


@router.get("/{trip_id}", response_model=TripRead)
async def get_public_trip(
    trip_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    stmt = select(Trip).options(selectinload(Trip.comments), selectinload(Trip.images)).where(Trip.id == trip_id)
    trip = (await session.scalars(stmt)).first()
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return _to_trip_read(trip)


@router.post("/{trip_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
async def create_public_trip_comment(
    trip_id: int,
    payload: CommentCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CommentRead:
    trip = await session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    comment = TripComment(
        trip_id=trip_id,
        name=payload.name.strip(),
        text=payload.text.strip(),
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    return CommentRead.model_validate(comment)
