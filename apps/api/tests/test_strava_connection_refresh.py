from datetime import datetime, timezone

from app.api.v1.routes.strava import _apply_token_payload
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
