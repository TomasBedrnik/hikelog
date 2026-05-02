from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models.activity import Activity


def effective_activity_timezone(activity: Activity) -> str | None:
    timezone_name = activity.timezone
    if timezone_name:
        return timezone_name
    if activity.trip is not None:
        return activity.trip.timezone
    return None


def display_activity_datetime(activity: Activity, value: datetime | None) -> datetime | None:
    if value is None:
        return None

    timezone_name = effective_activity_timezone(activity)
    if not timezone_name:
        return value

    try:
        destination_timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        return value

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value.astimezone(destination_timezone)


def activity_read_overrides(activity: Activity) -> dict[str, object]:
    return {
        "timezone": effective_activity_timezone(activity),
        "start_date": display_activity_datetime(activity, activity.start_date),
    }
