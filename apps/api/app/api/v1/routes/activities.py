from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.activity import Activity
from app.models.admin_user import AdminUser
from app.models.trip import Trip
from app.schemas.activity import ActivityCreate, ActivityRead, ActivityUpdate

router = APIRouter()


def _to_activity_read(activity: Activity) -> ActivityRead:
    return ActivityRead.model_validate(
        {
            **ActivityRead.model_validate(activity).model_dump(),
            "trip_name": activity.trip.name if activity.trip else None,
        }
    )


async def _get_trip_or_404(session: AsyncSession, trip_id: int) -> Trip:
    trip = await session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


async def _get_activity_or_404(session: AsyncSession, activity_id: int) -> Activity:
    stmt = select(Activity).options(selectinload(Activity.trip)).where(Activity.id == activity_id)
    activity = (await session.scalars(stmt)).first()
    if activity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


@router.get("", response_model=list[ActivityRead])
async def list_activities(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ActivityRead]:
    stmt = select(Activity).options(selectinload(Activity.trip)).order_by(
        Activity.start_date.desc().nullslast(),
        Activity.created_at.desc(),
        Activity.id.desc(),
    )
    activities = (await session.scalars(stmt)).all()
    return [_to_activity_read(activity) for activity in activities]


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
async def create_activity(
    payload: ActivityCreate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ActivityRead:
    await _get_trip_or_404(session, payload.trip_id)
    activity = Activity(**payload.model_dump())
    session.add(activity)
    await session.commit()
    activity = await _get_activity_or_404(session, activity.id)
    return _to_activity_read(activity)


@router.get("/{activity_id}", response_model=ActivityRead)
async def get_activity(
    activity_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ActivityRead:
    activity = await _get_activity_or_404(session, activity_id)
    return _to_activity_read(activity)


@router.patch("/{activity_id}", response_model=ActivityRead)
async def update_activity(
    activity_id: int,
    payload: ActivityUpdate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ActivityRead:
    activity = await _get_activity_or_404(session, activity_id)
    values = payload.model_dump(exclude_unset=True)

    if "trip_id" in values and values["trip_id"] is not None:
        await _get_trip_or_404(session, values["trip_id"])

    for field, value in values.items():
        setattr(activity, field, value)

    await session.commit()
    activity = await _get_activity_or_404(session, activity_id)
    return _to_activity_read(activity)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    activity = await session.get(Activity, activity_id)
    if activity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")

    await session.delete(activity)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
