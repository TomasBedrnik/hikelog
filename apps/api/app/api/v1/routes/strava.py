from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.admin_user import AdminUser
from app.models.strava_connection import StravaConnection
from app.schemas.strava import (
    StravaAuthorizationRead,
    StravaConnectionRead,
    StravaRecentActivityRead,
)
from app.services.strava import (
    StravaServiceError,
    StravaTokenPayload,
    build_authorization_url,
    exchange_code_for_token,
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
