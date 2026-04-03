from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import requests

from app.core.config import settings

STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"
STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_API_URL = "https://www.strava.com/api/v3"
DEFAULT_STRAVA_SCOPE = "read,activity:read_all"


class StravaServiceError(RuntimeError):
    def __init__(self, detail: str, status_code: int = 502) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


@dataclass
class StravaTokenPayload:
    access_token: str
    refresh_token: str
    expires_at: datetime
    athlete_id: int | None
    username: str | None
    firstname: str | None
    lastname: str | None
    profile_medium: str | None


def require_strava_settings() -> None:
    if settings.strava_enabled():
        return
    raise StravaServiceError("Strava OAuth is not configured", status_code=503)


def build_authorization_url(state: str) -> str:
    require_strava_settings()
    query = urlencode(
        {
            "client_id": settings.strava_client_id,
            "redirect_uri": settings.strava_redirect_uri,
            "response_type": "code",
            "approval_prompt": "force",
            "scope": DEFAULT_STRAVA_SCOPE,
            "state": state,
        }
    )
    return f"{STRAVA_AUTHORIZE_URL}?{query}"


def exchange_code_for_token(code: str) -> StravaTokenPayload:
    require_strava_settings()
    try:
        response = requests.post(
            STRAVA_TOKEN_URL,
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "code": code,
                "grant_type": "authorization_code",
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        raise StravaServiceError("Unable to reach Strava token endpoint", status_code=502) from exc
    return _parse_token_response(response)


def refresh_access_token(refresh_token: str) -> StravaTokenPayload:
    require_strava_settings()
    try:
        response = requests.post(
            STRAVA_TOKEN_URL,
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        raise StravaServiceError("Unable to reach Strava token endpoint", status_code=502) from exc
    return _parse_token_response(response)


def list_recent_activities(access_token: str, *, per_page: int = 10) -> list[dict[str, Any]]:
    try:
        response = requests.get(
            f"{STRAVA_API_URL}/athlete/activities",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"page": 1, "per_page": per_page},
            timeout=30,
        )
    except requests.RequestException as exc:
        raise StravaServiceError("Unable to reach Strava activities endpoint", status_code=502) from exc

    if not response.ok:
        raise StravaServiceError(_extract_error_detail(response), status_code=502)

    payload = response.json()
    if not isinstance(payload, list):
        raise StravaServiceError("Invalid Strava activities response", status_code=502)
    return payload


def get_activity(access_token: str, activity_id: int) -> dict[str, Any]:
    try:
        response = requests.get(
            f"{STRAVA_API_URL}/activities/{activity_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"include_all_efforts": "false"},
            timeout=30,
        )
    except requests.RequestException as exc:
        raise StravaServiceError("Unable to reach Strava activity endpoint", status_code=502) from exc

    if not response.ok:
        raise StravaServiceError(_extract_error_detail(response), status_code=502)

    payload = response.json()
    if not isinstance(payload, dict):
        raise StravaServiceError("Invalid Strava activity response", status_code=502)
    return payload


def _parse_token_response(response: requests.Response) -> StravaTokenPayload:
    if not response.ok:
        raise StravaServiceError(_extract_error_detail(response), status_code=502)

    payload = response.json()
    if not isinstance(payload, dict):
        raise StravaServiceError("Invalid Strava token response", status_code=502)

    athlete = payload.get("athlete") if isinstance(payload.get("athlete"), dict) else {}
    expires_at_raw = payload.get("expires_at")
    if not isinstance(expires_at_raw, int | float):
        raise StravaServiceError("Strava token response is missing expires_at", status_code=502)

    return StravaTokenPayload(
        access_token=str(payload.get("access_token") or ""),
        refresh_token=str(payload.get("refresh_token") or ""),
        expires_at=datetime.fromtimestamp(expires_at_raw, tz=timezone.utc),
        athlete_id=_int_or_none(athlete.get("id")),
        username=_str_or_none(athlete.get("username")),
        firstname=_str_or_none(athlete.get("firstname")),
        lastname=_str_or_none(athlete.get("lastname")),
        profile_medium=_str_or_none(athlete.get("profile_medium")),
    )


def _extract_error_detail(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        text = response.text.strip()
        return text or f"Strava request failed with status {response.status_code}"

    if isinstance(payload, dict):
        message = payload.get("message")
        errors = payload.get("errors")
        if isinstance(errors, list) and errors:
            parts: list[str] = []
            for error in errors:
                if isinstance(error, dict):
                    resource = error.get("resource")
                    field = error.get("field")
                    code = error.get("code")
                    detail = ":".join(str(part) for part in (resource, field, code) if part)
                    if detail:
                        parts.append(detail)
            if message and parts:
                return f"{message} ({', '.join(parts)})"
            if parts:
                return ", ".join(parts)
        if isinstance(message, str) and message.strip():
            return message

    text = response.text.strip()
    return text or f"Strava request failed with status {response.status_code}"


def _int_or_none(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _str_or_none(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
