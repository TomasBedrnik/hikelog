from datetime import datetime, timezone

from app.api.v1.routes.strava import (
    _apply_token_payload,
    _strava_start_datetime_or_none,
    _strava_timezone_or_none,
)
from app.models.strava_connection import StravaConnection
from app.services.strava import StravaTokenPayload


def test_apply_token_payload_preserves_existing_athlete_fields_on_refresh():
    connection = StravaConnection(
        access_token="old-access",
        refresh_token="old-refresh",
        athlete_id=123,
        username="rider",
        firstname="Ada",
        lastname="Lovelace",
        profile_medium="https://example.com/profile.jpg",
        scopes="read,activity:read_all",
    )

    payload = StravaTokenPayload(
        access_token="new-access",
        refresh_token="new-refresh",
        expires_at=datetime(2026, 4, 10, tzinfo=timezone.utc),
        athlete_id=None,
        username=None,
        firstname=None,
        lastname=None,
        profile_medium=None,
    )

    _apply_token_payload(connection, payload, ["read", "activity:read_all"])

    assert connection.access_token == "new-access"
    assert connection.refresh_token == "new-refresh"
    assert connection.athlete_id == 123
    assert connection.username == "rider"
    assert connection.firstname == "Ada"
    assert connection.lastname == "Lovelace"
    assert connection.profile_medium == "https://example.com/profile.jpg"


def test_apply_token_payload_preserves_existing_refresh_token_when_missing():
    connection = StravaConnection(
        access_token="old-access",
        refresh_token="old-refresh",
        athlete_id=123,
    )

    payload = StravaTokenPayload(
        access_token="new-access",
        refresh_token=None,
        expires_at=datetime(2026, 4, 10, tzinfo=timezone.utc),
        athlete_id=None,
        username=None,
        firstname=None,
        lastname=None,
        profile_medium=None,
    )

    _apply_token_payload(connection, payload, [])

    assert connection.access_token == "new-access"
    assert connection.refresh_token == "old-refresh"
    assert connection.athlete_id == 123


def test_strava_start_datetime_uses_local_date_with_strava_timezone():
    parsed = _strava_start_datetime_or_none(
        "2026-05-02T06:44:00Z",
        "(GMT+09:00) Asia/Seoul",
        "2026-05-01T19:44:00Z",
    )

    assert parsed == datetime(2026, 5, 1, 21, 44, tzinfo=timezone.utc)


def test_strava_timezone_extracts_iana_name():
    assert _strava_timezone_or_none("(GMT+09:00) Asia/Seoul") == "Asia/Seoul"
