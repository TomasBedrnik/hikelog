from datetime import UTC, datetime
from pathlib import Path

from PIL import Image

from app.services.image_uploads import (
    _extract_capture_datetime_local,
    _extract_image_capture_metadata,
    _parse_exif_timezone,
)
from app.services.video_uploads import _extract_video_metadata, _parse_capture_datetime_local

FIXTURE_DIR = Path(__file__).parent / "data"


def test_parse_video_capture_datetime_keeps_local_clock_with_timezone_info():
    capture_datetime_local, timezone = _parse_capture_datetime_local("2026:05:02 06:44:00+09:00")

    assert capture_datetime_local == datetime(2026, 5, 2, 6, 44)
    assert timezone == "+09:00"


def test_parse_video_capture_datetime_without_timezone():
    capture_datetime_local, timezone = _parse_capture_datetime_local("2026:05:02 06:44:00")

    assert capture_datetime_local == datetime(2026, 5, 2, 6, 44)
    assert timezone is None


def test_parse_exif_timezone_accepts_offset_time():
    assert _parse_exif_timezone("+09:00") == "+09:00"
    assert _parse_exif_timezone("-03:30") == "-03:30"
    assert _parse_exif_timezone("Asia/Seoul") is None


def test_fixture_photo_capture_datetime_and_timezone():
    with Image.open(FIXTURE_DIR / "IMG_20260418_070425536_HDR.jpg") as image:
        capture_datetime_local, timezone = _extract_capture_datetime_local(image)

    assert capture_datetime_local == datetime(2026, 4, 18, 7, 4, 26)
    assert timezone == "+09:00"


def test_fixture_photo_capture_metadata():
    with Image.open(FIXTURE_DIR / "IMG_20260418_070425536_HDR.jpg") as image:
        metadata = _extract_image_capture_metadata(image, parent_timezone="Asia/Seoul")

    assert metadata.capture_datetime_local == datetime(2026, 4, 18, 7, 4, 26)
    assert metadata.timezone == "+09:00"
    assert metadata.capture_datetime_utc == datetime(2026, 4, 17, 22, 4, 26, tzinfo=UTC)
    assert metadata.capture_timezone_source == "gps"
    assert metadata.capture_datetime_source == "exif_local"
    assert metadata.gps_datetime_utc == datetime(2026, 4, 17, 22, 4, 25, tzinfo=UTC)
    assert metadata.gps_timezone == "+09:00"


def test_fixture_video_capture_datetime_and_timezone():
    video_path = FIXTURE_DIR / "VID_20260418_070949772.mp4"

    (
        _gps_latitude,
        _gps_longitude,
        capture_datetime_local,
        timezone,
        capture_datetime_utc,
        capture_timezone_source,
        capture_datetime_source,
        gps_datetime_utc,
        gps_timezone,
        _width,
        _height,
        _duration_seconds,
    ) = _extract_video_metadata(video_path, parent_timezone="Asia/Seoul")

    assert capture_datetime_local == datetime(2026, 4, 18, 7, 9, 57)
    assert timezone == "Asia/Seoul"
    assert capture_datetime_utc == datetime(2026, 4, 17, 22, 9, 57, tzinfo=UTC)
    assert capture_timezone_source == "parent"
    assert capture_datetime_source == "mp4_utc"
    assert gps_datetime_utc is None
    assert gps_timezone is None
