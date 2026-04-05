from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import bindparam, create_engine, text
from sqlalchemy.engine import RowMapping

from app.db.session import SessionLocal
from app.models.activity import Activity
from app.models.activity_comment import ActivityComment
from app.models.activity_photo import ActivityPhoto
from app.models.trip import Trip

# One-off local migration script.
# Fill these in directly and run: `python scripts/import_travellog.py`
SOURCE_DSN = "mysql+pymysql://user:password@ip/travellog"
DEFAULT_TIMEZONE = "Europe/Prague"
PHOTO_TIMEOUT_SECONDS = 20
SKIP_EXISTING_ACTIVITIES = True
CONTINUE_ON_PHOTO_ERROR = True
ONLY_JOURNEYS: list[str] | None = None
DEFAULT_IMAGE_WIDTH = 1680
DEFAULT_IMAGE_HEIGHT = 1680
DEFAULT_THUMBNAIL_WIDTH = 350
DEFAULT_THUMBNAIL_HEIGHT = 350

# Either point a journey at an existing trip_id or let the script create one.
JOURNEY_CONFIG: dict[str, dict[str, Any]] = {
    "cr": {
        "name": "Czech Republic",
        "timezone": "Europe/Prague",
        "country_codes": ["CZ"],
    },
}


def parse_legacy_datetime(value: Any, timezone_name: str) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        dt = value
    else:
        raw = str(value).strip()
        if not raw:
            return None
        normalized = raw.replace("Z", "+00:00")
        dt = None
        for candidate in (normalized, normalized.replace(" ", "T")):
            try:
                dt = datetime.fromisoformat(candidate)
                break
            except ValueError:
                pass
        if dt is None:
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                try:
                    dt = datetime.strptime(raw, fmt)
                    break
                except ValueError:
                    pass
        if dt is None:
            raise ValueError(f"Unsupported datetime value: {value!r}")

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo(timezone_name))
    return dt.astimezone(UTC)


def paragraph_block(text_value: str) -> dict[str, Any]:
    return {"type": "paragraph", "content": [{"type": "text", "text": text_value}]}


def heading_block(text_value: str) -> dict[str, Any]:
    return {
        "type": "heading",
        "props": {"level": 2},
        "content": [{"type": "text", "text": text_value}],
    }


def bullet_block(text_value: str) -> dict[str, Any]:
    return {"type": "bulletListItem", "content": [{"type": "text", "text": text_value}]}


def build_activity_description(
    activity: RowMapping,
    audio_rows: list[RowMapping],
    video_rows: list[RowMapping],
    photo_rows: list[RowMapping],
) -> dict[str, Any] | None:
    blocks: list[dict[str, Any]] = []

    description = str(activity.get("description") or "").strip()
    if description:
        for line in description.splitlines():
            line = line.strip()
            if line:
                blocks.append(paragraph_block(line))

    legacy_bits: list[str] = []
    if activity.get("beer") is not None:
        legacy_bits.append(f"Beer: {int(activity['beer'])}")
    if activity.get("hamburgers") is not None:
        legacy_bits.append(f"Hamburgers: {int(activity['hamburgers'])}")
    if activity.get("pain"):
        legacy_bits.append(f"Pain: {activity['pain']}")
    if activity.get("journey"):
        legacy_bits.append(f"Journey: {activity['journey']}")
    if legacy_bits:
        blocks.append(heading_block("Legacy metadata"))
        blocks.extend(bullet_block(item) for item in legacy_bits)

    captions = [str(row.get("caption") or "").strip() for row in photo_rows]
    captions = [caption for caption in captions if caption]
    if captions:
        blocks.append(heading_block("Photo captions"))
        blocks.extend(bullet_block(caption) for caption in captions)

    audio_notes: list[str] = []
    for row in audio_rows:
        for key in ("text_manual_fix", "text_ai_manual_fix", "text_original", "text_ai_original"):
            value = str(row.get(key) or "").strip()
            if value:
                label = str(row.get("original_name") or row.get("id") or "Audio note")
                audio_notes.append(f"{label}: {value}")
                break
    if audio_notes:
        blocks.append(heading_block("Audio notes"))
        blocks.extend(paragraph_block(item) for item in audio_notes)

    videos: list[str] = []
    for row in video_rows:
        title = str(row.get("original_name") or row.get("caption") or "Video").strip()
        url = str(row.get("url") or "").strip()
        videos.append(f"{title}: {url}" if url else title)
    if videos:
        blocks.append(heading_block("Videos"))
        blocks.extend(paragraph_block(item) for item in videos)

    return {"blocks": blocks} if blocks else None


def guess_content_type(image_url: str, thumbnail_url: str) -> str:
    source = f"{image_url} {thumbnail_url}".lower()
    if ".png" in source:
        return "image/png"
    if ".jpg" in source or ".jpeg" in source:
        return "image/jpeg"
    return "image/jpeg"


def fetch_rows(connection, table_name: str, activity_ids: list[int], order_by: str) -> dict[int, list[RowMapping]]:
    if not activity_ids:
        return {}

    stmt = text(
        f"SELECT * FROM {table_name} WHERE activity_id IN :activity_ids ORDER BY {order_by}"
    ).bindparams(bindparam("activity_ids", expanding=True))
    rows = list(connection.execute(stmt, {"activity_ids": activity_ids}).mappings())

    grouped: dict[int, list[RowMapping]] = defaultdict(list)
    for row in rows:
        grouped[int(row["activity_id"])].append(row)
    return grouped


async def ensure_trip(session, journey: str, activity_rows: list[RowMapping]) -> int:
    config = JOURNEY_CONFIG.get(journey, {})
    target_trip_id = config.get("target_trip_id")
    if target_trip_id is not None:
        trip = await session.get(Trip, int(target_trip_id))
        if trip is None:
            raise ValueError(f"Trip {target_trip_id} not found for journey {journey!r}")
        return trip.id

    timezone_name = config.get("timezone") or DEFAULT_TIMEZONE
    parsed_dates = [
        parse_legacy_datetime(row.get("start_date_local"), timezone_name)
        for row in activity_rows
        if row.get("start_date_local")
    ]
    parsed_dates = [value for value in parsed_dates if value is not None]
    trip = Trip(
        name=config.get("name") or f"Imported {journey}",
        content={"blocks": [paragraph_block(f'Imported from travellog journey "{journey}".')]},
        start_date=min(parsed_dates).date() if parsed_dates else None,
        end_date=max(parsed_dates).date() if parsed_dates else None,
        timezone=timezone_name,
        country_codes=config.get("country_codes") or [],
        planned_distance_m=None,
        planned_path_polyline=None,
        show_planned_path=False,
        latitude=None,
        longitude=None,
        zoom=None,
        metrics_config={},
    )
    session.add(trip)
    await session.flush()
    print(f"Created trip {trip.id} for {journey!r}")
    return trip.id


async def import_activity(
    session,
    activity_row: RowMapping,
    trip_id: int,
    timezone_name: str,
    photo_rows: list[RowMapping],
    comment_rows: list[RowMapping],
    audio_rows: list[RowMapping],
    video_rows: list[RowMapping],
) -> None:
    activity_id = int(activity_row["id"])
    existing = await session.get(Activity, activity_id)
    if existing is not None:
        if SKIP_EXISTING_ACTIVITIES:
            print(f"Skipping existing activity {activity_id}")
            return
        raise ValueError(f"Activity {activity_id} already exists")

    start_date = parse_legacy_datetime(activity_row.get("start_date_local"), timezone_name)
    activity = Activity(
        id=activity_id,
        trip_id=trip_id,
        strava_activity_id=None,
        user_id=int(activity_row["user_id"]) if activity_row.get("user_id") is not None else None,
        upload_id=int(activity_row["upload_id"]) if activity_row.get("upload_id") is not None else None,
        external_id=str(activity_row["external_id"]) if activity_row.get("external_id") else None,
        type=str(activity_row["type"]) if activity_row.get("type") else None,
        sport_type=str(activity_row["type"]) if activity_row.get("type") else None,
        start_date=start_date,
        name=str(activity_row["name"]).strip(),
        distance=float(activity_row["distance"]) if activity_row.get("distance") is not None else None,
        moving_time=int(activity_row["moving_time"]) if activity_row.get("moving_time") is not None else None,
        elapsed_time=int(activity_row["elapsed_time"]) if activity_row.get("elapsed_time") is not None else None,
        total_elevation_gain=(
            float(activity_row["total_elevation_gain"])
            if activity_row.get("total_elevation_gain") is not None
            else None
        ),
        description=build_activity_description(activity_row, audio_rows, video_rows, photo_rows),
        polyline=str(activity_row["polyline"]) if activity_row.get("polyline") else None,
        summary_polyline=str(activity_row["summary_polyline"])
        if activity_row.get("summary_polyline")
        else None,
    )
    session.add(activity)
    await session.flush()

    for index, row in enumerate(photo_rows):
        image_url = str(row.get("url_big") or "").strip()
        thumbnail_url = str(row.get("url_small") or image_url).strip()
        if not image_url or not thumbnail_url:
            continue

        content_type = guess_content_type(image_url, thumbnail_url)

        session.add(
            ActivityPhoto(
                activity_id=activity_id,
                position=index,
                storage_path="",
                thumbnail_storage_path="",
                tiny_thumbnail_storage_path=None,
                image_url=image_url,
                thumbnail_url=thumbnail_url,
                tiny_thumbnail_url=None,
                width=DEFAULT_IMAGE_WIDTH,
                height=DEFAULT_IMAGE_HEIGHT,
                thumbnail_width=DEFAULT_THUMBNAIL_WIDTH,
                thumbnail_height=DEFAULT_THUMBNAIL_HEIGHT,
                tiny_thumbnail_width=None,
                tiny_thumbnail_height=None,
                content_type=content_type,
                original_filename=(
                    str(row.get("original_name") or "").strip()
                    or str(row.get("id") or f"activity-{activity_id}-photo-{index + 1}")
                ),
                gps_latitude=None,
                gps_longitude=None,
            )
        )

    for row in comment_rows:
        text_value = str(row.get("text") or "").strip()
        if not text_value:
            continue
        session.add(
            ActivityComment(
                activity_id=activity_id,
                name=(str(row.get("name") or "Anonymous").strip() or "Anonymous")[:120],
                text=text_value,
                created_at=(
                    parse_legacy_datetime(row.get("date"), timezone_name)
                    or start_date
                    or datetime.now(UTC)
                ),
            )
        )

    print(f"Imported activity {activity_id}: {activity.name}")


async def main() -> None:
    source_engine = create_engine(SOURCE_DSN)
    try:
        with source_engine.connect() as connection:
            stmt = text(
                """
                SELECT
                    id,
                    user_id,
                    upload_id,
                    external_id,
                    start_date_local,
                    name,
                    distance,
                    moving_time,
                    elapsed_time,
                    total_elevation_gain,
                    type,
                    description,
                    polyline,
                    summary_polyline,
                    total_photo_count,
                    beer,
                    hamburgers,
                    pain,
                    journey
                FROM activities
                ORDER BY journey, start_date_local, id
                """
            )
            activity_rows = list(connection.execute(stmt).mappings())

            if ONLY_JOURNEYS:
                allowed = set(ONLY_JOURNEYS)
                activity_rows = [
                    row
                    for row in activity_rows
                    if (str(row.get("journey") or "").strip() or "default") in allowed
                ]

            activity_ids = [int(row["id"]) for row in activity_rows]
            photos_by_activity = fetch_rows(connection, "photos", activity_ids, "photo_order ASC, id ASC")
            comments_by_activity = fetch_rows(connection, "comments", activity_ids, "date ASC, id ASC")
            audio_by_activity = fetch_rows(connection, "audio", activity_ids, "id ASC")
            videos_by_activity = fetch_rows(connection, "videos", activity_ids, "`order` ASC, id ASC")

        activities_by_journey: dict[str, list[RowMapping]] = defaultdict(list)
        for row in activity_rows:
            journey = str(row.get("journey") or "").strip() or "default"
            activities_by_journey[journey].append(row)

        async with SessionLocal() as session:
            trip_ids: dict[str, int] = {}
            for journey, rows in activities_by_journey.items():
                trip_ids[journey] = await ensure_trip(session, journey, rows)
            await session.commit()

            for journey, rows in activities_by_journey.items():
                timezone_name = JOURNEY_CONFIG.get(journey, {}).get("timezone") or DEFAULT_TIMEZONE
                for row in rows:
                    activity_id = int(row["id"])
                    await import_activity(
                        session=session,
                        activity_row=row,
                        trip_id=trip_ids[journey],
                        timezone_name=timezone_name,
                        photo_rows=photos_by_activity.get(activity_id, []),
                        comment_rows=comments_by_activity.get(activity_id, []),
                        audio_rows=audio_by_activity.get(activity_id, []),
                        video_rows=videos_by_activity.get(activity_id, []),
                    )
                    await session.commit()

            await session.execute(
                text(
                    """
                    ALTER SEQUENCE activities_id_seq AS bigint;
                    """
                )
            )
            await session.execute(
                text(
                    """
                    SELECT setval(
                        pg_get_serial_sequence('activities', 'id'),
                        COALESCE((SELECT MAX(id) FROM activities), 1),
                        true
                    )
                    """
                )
            )
            await session.commit()
    finally:
        source_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
