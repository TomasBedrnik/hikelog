from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models.activity import Activity
from app.schemas.activity import ActivityRead, ActivitySummaryRead

router = APIRouter()


def _to_activity_read(activity: Activity) -> ActivityRead:
    return ActivityRead.model_validate(
        {
            **ActivityRead.model_validate(activity).model_dump(),
            "trip_name": activity.trip.name if activity.trip else None,
        }
    )


@router.get("/trips/{trip_id}/activities", response_model=list[ActivitySummaryRead])
async def list_public_trip_activities(
    trip_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ActivitySummaryRead]:
    stmt = (
        select(Activity)
        .options(selectinload(Activity.photos))
        .where(Activity.trip_id == trip_id)
        .order_by(Activity.start_date.desc().nullslast(), Activity.created_at.desc(), Activity.id.desc())
    )
    activities = (await session.scalars(stmt)).all()
    return [ActivitySummaryRead.model_validate(activity) for activity in activities]


@router.get("/activities/{activity_id}", response_model=ActivityRead)
async def get_public_activity(
    activity_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ActivityRead:
    stmt = (
        select(Activity)
        .options(selectinload(Activity.trip), selectinload(Activity.photos))
        .where(Activity.id == activity_id)
    )
    activity = (await session.scalars(stmt)).first()
    if activity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return _to_activity_read(activity)
