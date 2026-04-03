from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.activity import Activity
from app.models.admin_user import AdminUser
from app.models.strava_connection import StravaConnection
from app.models.trip import Trip
from app.schemas.activity import ActivityRead
from app.schemas.strava import (
    StravaActivityImport,
    StravaAuthorizationRead,
    StravaConnectionRead,
    StravaRecentActivityRead,
)
from app.services.strava import (
    StravaServiceError,
    StravaTokenPayload,
    build_authorization_url,
    exchange_code_for_token,
    get_activity,
    list_recent_activities,
    refresh_access_token,
    require_strava_settings,
)

router = APIRouter()
STATE_TTL = timedelta(minutes=15)


def _scopes_to_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def _to_connection_read(connection: StravaConnection | None) -> StravaConnectionRead:
    if connection is None:
        return StravaConnectionRead(
            connected=False,
            athlete_id=None,
            username=None,
            firstname=None,
            lastname=None,
            profile_medium=None,
            scopes=[],
            expires_at=None,
        )

    connected = bool(connection.access_token and connection.refresh_token and connection.athlete_id)
    return StravaConnectionRead(
        connected=connected,
        athlete_id=connection.athlete_id,
        username=connection.username,
        firstname=connection.firstname,
        lastname=connection.lastname,
        profile_medium=connection.profile_medium,
        scopes=_scopes_to_list(connection.scopes),
        expires_at=connection.expires_at,
    )


async def _get_connection(session: AsyncSession) -> StravaConnection | None:
    stmt = select(StravaConnection).order_by(StravaConnection.id.asc())
    return (await session.scalars(stmt)).first()


async def _get_or_create_connection(session: AsyncSession) -> StravaConnection:
    connection = await _get_connection(session)
    if connection is not None:
        return connection

    connection = StravaConnection()
    session.add(connection)
    await session.commit()
    await session.refresh(connection)
    return connection


async def _get_trip_or_404(session: AsyncSession, trip_id: int) -> Trip:
    trip = await session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


async def _get_activity_with_relations(session: AsyncSession, activity_id: int) -> Activity:
    stmt = (
        select(Activity)
        .options(selectinload(Activity.trip), selectinload(Activity.comments), selectinload(Activity.photos))
        .where(Activity.id == activity_id)
    )
    activity = (await session.scalars(stmt)).first()
    if activity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


def _to_activity_read(activity: Activity) -> ActivityRead:
    return ActivityRead.model_validate(
        {
            **ActivityRead.model_validate(activity).model_dump(),
            "trip_name": activity.trip.name if activity.trip else None,
        }
    )


def _apply_token_payload(
    connection: StravaConnection, token_payload: StravaTokenPayload, scopes: list[str]
) -> None:
    connection.access_token = token_payload.access_token
    connection.refresh_token = token_payload.refresh_token
    connection.expires_at = token_payload.expires_at
    connection.athlete_id = token_payload.athlete_id
    connection.username = token_payload.username
    connection.firstname = token_payload.firstname
    connection.lastname = token_payload.lastname
    connection.profile_medium = token_payload.profile_medium
    connection.scopes = ",".join(scopes)
    connection.oauth_state = None
    connection.oauth_state_created_at = None


def _callback_redirect_url(success: bool, error: str | None = None) -> str:
    from app.core.config import settings

    base_url = settings.strava_admin_redirect_url_value()
    if not base_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Missing STRAVA_ADMIN_REDIRECT_URL or CORS_ALLOWED_ORIGINS",
        )

    if success and not error:
        return base_url

    query = urlencode({"strava": "error", "message": error or "authorization_failed"})
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{query}"


async def _ensure_fresh_token(session: AsyncSession, connection: StravaConnection) -> StravaConnection:
    now = datetime.now(timezone.utc)
    if (
        connection.access_token
        and connection.refresh_token
        and connection.expires_at is not None
        and connection.expires_at > now + timedelta(minutes=5)
    ):
        return connection

    if not connection.refresh_token:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Strava account is not connected")

    try:
        token_payload = refresh_access_token(connection.refresh_token)
    except StravaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    _apply_token_payload(connection, token_payload, _scopes_to_list(connection.scopes))
    await session.commit()
    await session.refresh(connection)
    return connection


@router.get("/connection", response_model=StravaConnectionRead)
async def get_strava_connection(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StravaConnectionRead:
    try:
        require_strava_settings()
    except StravaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    connection = await _get_connection(session)
    if connection is not None and connection.refresh_token:
        connection = await _ensure_fresh_token(session, connection)

    return _to_connection_read(connection)


@router.post("/connection/authorize", response_model=StravaAuthorizationRead)
async def authorize_strava_connection(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StravaAuthorizationRead:
    try:
        require_strava_settings()
    except StravaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    connection = await _get_or_create_connection(session)
    connection.oauth_state = secrets.token_urlsafe(32)
    connection.oauth_state_created_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(connection)

    return StravaAuthorizationRead(authorization_url=build_authorization_url(connection.oauth_state))


@router.get("/callback", include_in_schema=False)
async def handle_strava_callback(
    session: Annotated[AsyncSession, Depends(get_session)],
    state: Annotated[str | None, Query()] = None,
    code: Annotated[str | None, Query()] = None,
    scope: Annotated[str | None, Query()] = None,
    error: Annotated[str | None, Query()] = None,
) -> RedirectResponse:
    try:
        require_strava_settings()
    except StravaServiceError as exc:
        return RedirectResponse(
            _callback_redirect_url(success=False, error=exc.detail),
            status_code=status.HTTP_303_SEE_OTHER,
        )

    if error:
        return RedirectResponse(_callback_redirect_url(success=False, error=error), status_code=status.HTTP_303_SEE_OTHER)

    if not state or not code:
        return RedirectResponse(
            _callback_redirect_url(success=False, error="missing_code_or_state"),
            status_code=status.HTTP_303_SEE_OTHER,
        )

    connection = await _get_connection(session)
    now = datetime.now(timezone.utc)
    if (
        connection is None
        or connection.oauth_state != state
        or connection.oauth_state_created_at is None
        or connection.oauth_state_created_at < now - STATE_TTL
    ):
        return RedirectResponse(
            _callback_redirect_url(success=False, error="invalid_or_expired_state"),
            status_code=status.HTTP_303_SEE_OTHER,
        )

    try:
        token_payload = exchange_code_for_token(code)
    except StravaServiceError as exc:
        return RedirectResponse(
            _callback_redirect_url(success=False, error=exc.detail),
            status_code=status.HTTP_303_SEE_OTHER,
        )

    scopes = _scopes_to_list(scope)
    _apply_token_payload(connection, token_payload, scopes)
    await session.commit()

    return RedirectResponse(_callback_redirect_url(success=True), status_code=status.HTTP_303_SEE_OTHER)


@router.delete("/connection", status_code=status.HTTP_204_NO_CONTENT)
async def delete_strava_connection(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    connection = await _get_connection(session)
    if connection is None:
        return None

    await session.delete(connection)
    await session.commit()
    return None


@router.get("/activities/recent", response_model=list[StravaRecentActivityRead])
async def get_recent_strava_activities(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[StravaRecentActivityRead]:
    try:
        require_strava_settings()
    except StravaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    connection = await _get_connection(session)
    if connection is None or not connection.refresh_token:
        return []

    connection = await _ensure_fresh_token(session, connection)

    try:
        activities = list_recent_activities(connection.access_token or "")
    except StravaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return [
        StravaRecentActivityRead(
            id=int(activity["id"]),
            name=str(activity.get("name") or f"Activity {activity['id']}"),
            sport_type=activity.get("sport_type"),
            start_date=datetime.fromisoformat(str(activity["start_date"]).replace("Z", "+00:00")),
            distance=float(activity["distance"]) if activity.get("distance") is not None else None,
            moving_time=int(activity["moving_time"]) if activity.get("moving_time") is not None else None,
            total_elevation_gain=(
                float(activity["total_elevation_gain"])
                if activity.get("total_elevation_gain") is not None
                else None
            ),
        )
        for activity in activities
        if isinstance(activity, dict) and activity.get("id") is not None and activity.get("start_date") is not None
    ]


@router.post("/activities/{activity_id}/import", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
async def import_strava_activity(
    activity_id: int,
    payload: StravaActivityImport,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ActivityRead:
    try:
        require_strava_settings()
    except StravaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    await _get_trip_or_404(session, payload.trip_id)

    existing_stmt = select(Activity).where(Activity.strava_activity_id == activity_id)
    existing = await session.scalar(existing_stmt)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Activity already imported")

    connection = await _get_connection(session)
    if connection is None or not connection.refresh_token:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Strava account is not connected")

    connection = await _ensure_fresh_token(session, connection)

    try:
        strava_activity = get_activity(connection.access_token or "", activity_id)
    except StravaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    map_payload = strava_activity.get("map") if isinstance(strava_activity.get("map"), dict) else {}
    local_activity = Activity(
        trip_id=payload.trip_id,
        strava_activity_id=activity_id,
        user_id=connection.athlete_id,
        upload_id=_int_or_none(strava_activity.get("upload_id")),
        external_id=_str_or_none(strava_activity.get("external_id")),
        type=_str_or_none(strava_activity.get("type")),
        sport_type=_str_or_none(strava_activity.get("sport_type")),
        start_date=_datetime_or_none(strava_activity.get("start_date")),
        name=_str_or_none(strava_activity.get("name")) or f"Strava activity {activity_id}",
        distance=_float_or_none(strava_activity.get("distance")),
        moving_time=_int_or_none(strava_activity.get("moving_time")),
        elapsed_time=_int_or_none(strava_activity.get("elapsed_time")),
        total_elevation_gain=_float_or_none(strava_activity.get("total_elevation_gain")),
        polyline=_str_or_none(map_payload.get("polyline")),
        summary_polyline=_str_or_none(map_payload.get("summary_polyline")),
        description=None,
    )
    session.add(local_activity)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Activity already imported") from None

    local_activity = await _get_activity_with_relations(session, local_activity.id)
    return _to_activity_read(local_activity)


def _int_or_none(value: object) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _float_or_none(value: object) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _str_or_none(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _datetime_or_none(value: object) -> datetime | None:
    text = _str_or_none(value)
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
