from datetime import datetime, timezone

from app.models.activity import Activity
from app.models.trip import Trip
from app.services.activity_timezones import activity_read_overrides


def test_activity_read_overrides_prefers_activity_timezone():
    activity = Activity(
        id=1,
        trip_id=1,
        name="Morning hike",
        start_date=datetime(2026, 5, 1, 21, 44, tzinfo=timezone.utc),
        timezone="Asia/Seoul",
    )
    activity.trip = Trip(id=1, name="Trip", timezone="Europe/Prague")

    overrides = activity_read_overrides(activity)

    assert overrides["timezone"] == "Asia/Seoul"
    assert overrides["start_date"].isoformat() == "2026-05-02T06:44:00+09:00"


def test_activity_read_overrides_falls_back_to_trip_timezone():
    activity = Activity(
        id=1,
        trip_id=1,
        name="Evening hike",
        start_date=datetime(2026, 5, 1, 21, 44, tzinfo=timezone.utc),
    )
    activity.trip = Trip(id=1, name="Trip", timezone="Europe/Prague")

    overrides = activity_read_overrides(activity)

    assert overrides["timezone"] == "Europe/Prague"
    assert overrides["start_date"].isoformat() == "2026-05-01T23:44:00+02:00"
