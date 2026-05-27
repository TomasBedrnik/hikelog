from __future__ import annotations

import json
import mimetypes
import re
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.services.firebase_storage import firebase_storage

SUPPORTED_VIDEO_EXTENSIONS = {
    ".3gp",
    ".avi",
    ".m4v",
    ".mov",
    ".mp4",
    ".mpeg",
    ".mpg",
    ".ogv",
    ".qt",
    ".webm",
}
SUPPORTED_VIDEO_CONTENT_TYPES = {
    "video/3gpp": "3gp",
    "video/avi": "avi",
    "video/mp4": "mp4",
    "video/mpeg": "mpeg",
    "video/ogg": "ogv",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-m4v": "m4v",
    "video/x-msvideo": "avi",
    "video/x-quicktime": "mov",
}
THUMBNAIL_MAX_SIZE = (480, 480)
TINY_THUMBNAIL_MAX_SIZE = (96, 96)
THUMBNAIL_CONTENT_TYPE = "image/jpeg"
UPLOAD_CHUNK_SIZE = 1024 * 1024
TIMEZONE_PATTERN = re.compile(r"(?P<timezone>Z|[+-]\d{2}:?\d{2})$")


@dataclass(slots=True)
class UploadedVideoPayload:
    original_storage_path: str
    compressed_storage_path: str | None
    thumbnail_storage_path: str | None
    tiny_thumbnail_storage_path: str | None
    original_video_url: str
    compressed_video_url: str | None
    thumbnail_url: str | None
    tiny_thumbnail_url: str | None
    width: int | None
    height: int | None
    duration_seconds: float | None
    content_type: str
    original_filename: str | None
    gps_latitude: float | None
    gps_longitude: float | None
    capture_datetime_local: datetime | None
    timezone: str | None
    capture_datetime_utc: datetime | None
    capture_timezone_source: str
    capture_datetime_source: str
    gps_datetime_utc: datetime | None
    gps_timezone: str | None


@dataclass(slots=True)
class VideoCaptureMetadata:
    capture_datetime_local: datetime | None
    timezone: str | None
    capture_datetime_utc: datetime | None
    capture_timezone_source: str
    capture_datetime_source: str
    gps_datetime_utc: datetime | None
    gps_timezone: str | None


def _normalized_extension(filename: str | None) -> str | None:
    if not filename:
        return None
    suffix = Path(filename).suffix.lower()
    return suffix or None


def _normalize_timezone(value: str) -> str | None:
    if value == "Z":
        return "+00:00"
    if len(value) == 5 and value[0] in {"+", "-"}:
        return f"{value[:3]}:{value[3:]}"
    if len(value) == 6 and value[0] in {"+", "-"} and value[3] == ":":
        return value
    return None


def _format_timezone_offset(offset: timedelta) -> str | None:
    total_minutes = round(offset.total_seconds() / 60)
    rounded_minutes = int(round(total_minutes / 15) * 15)
    if rounded_minutes < -14 * 60 or rounded_minutes > 14 * 60:
        return None

    sign = "+" if rounded_minutes >= 0 else "-"
    absolute_minutes = abs(rounded_minutes)
    hours, minutes = divmod(absolute_minutes, 60)
    return f"{sign}{hours:02d}:{minutes:02d}"


def _timezone_info(timezone_name: str | None, value: datetime) -> timezone | ZoneInfo | None:
    if not timezone_name:
        return None

    normalized = _normalize_timezone(timezone_name)
    if normalized is not None:
        sign = 1 if normalized[0] == "+" else -1
        hours = int(normalized[1:3])
        minutes = int(normalized[4:6])
        return timezone(sign * timedelta(hours=hours, minutes=minutes))

    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        return None


def _local_to_utc(value: datetime | None, timezone_name: str | None) -> datetime | None:
    if value is None:
        return None

    tzinfo = _timezone_info(timezone_name, value)
    if tzinfo is None:
        return None

    return value.replace(tzinfo=tzinfo).astimezone(UTC)


def _utc_to_local(value: datetime | None, timezone_name: str | None) -> datetime | None:
    if value is None:
        return None

    tzinfo = _timezone_info(timezone_name, value)
    if tzinfo is None:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(tzinfo).replace(tzinfo=None)


def _extract_timezone_from_datetime_text(value: str) -> str | None:
    match = TIMEZONE_PATTERN.search(value.strip())
    if match is None:
        return None
    return _normalize_timezone(match.group("timezone"))


def _parse_capture_datetime_local(value: object) -> tuple[datetime | None, str | None]:
    if not isinstance(value, str):
        return None, None
    text = value.strip()
    if not text:
        return None, None

    parsed_timezone = _extract_timezone_from_datetime_text(text)
    formats = (
        "%Y:%m:%d %H:%M:%S%z",
        "%Y:%m:%d %H:%M:%S",
        "%Y:%m:%d %H:%M:%S.%f%z",
        "%Y:%m:%d %H:%M:%S.%f",
    )
    for fmt in formats:
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.replace(tzinfo=None), parsed_timezone
        except ValueError:
            continue
    return None, None


def _capture_metadata_from_datetime_text(
    value: object,
    *,
    parent_timezone: str | None,
    source: str,
) -> VideoCaptureMetadata | None:
    parsed_local, parsed_timezone = _parse_capture_datetime_local(value)
    if parsed_local is None:
        return None

    if parsed_timezone is not None:
        return VideoCaptureMetadata(
            capture_datetime_local=parsed_local,
            timezone=parsed_timezone,
            capture_datetime_utc=_local_to_utc(parsed_local, parsed_timezone),
            capture_timezone_source="embedded",
            capture_datetime_source=source,
            gps_datetime_utc=None,
            gps_timezone=None,
        )

    capture_datetime_utc = parsed_local.replace(tzinfo=UTC)
    return VideoCaptureMetadata(
        capture_datetime_local=(
            _utc_to_local(capture_datetime_utc, parent_timezone)
            if parent_timezone
            else parsed_local
        ),
        timezone=parent_timezone,
        capture_datetime_utc=capture_datetime_utc,
        capture_timezone_source="parent" if parent_timezone else "unknown",
        capture_datetime_source="mp4_utc",
        gps_datetime_utc=None,
        gps_timezone=None,
    )


def _extract_video_metadata(
    video_path: Path,
    *,
    parent_timezone: str | None = None,
) -> tuple[
    float | None,
    float | None,
    datetime | None,
    str | None,
    datetime | None,
    str,
    str,
    datetime | None,
    str | None,
    int | None,
    int | None,
    float | None,
]:
    try:
        result = subprocess.run(
            ["exiftool", "-j", "-n", str(video_path)],
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Video metadata extraction is not available on this server.",
        ) from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or "").strip()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail or "Video metadata could not be read.",
        ) from exc

    try:
        parsed = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Video metadata output could not be parsed.",
        ) from exc

    if not parsed or not isinstance(parsed, list) or not isinstance(parsed[0], dict):
        return None, None, None, None, None, "unknown", "unknown", None, None, None, None, None

    metadata = parsed[0]
    gps_latitude = metadata.get("GPSLatitude")
    gps_longitude = metadata.get("GPSLongitude")
    width = metadata.get("ImageWidth") or metadata.get("SourceImageWidth")
    height = metadata.get("ImageHeight") or metadata.get("SourceImageHeight")
    duration_seconds = metadata.get("Duration")
    capture_metadata = None
    for key in (
        "DateTimeOriginal",
        "CreateDate",
        "MediaCreateDate",
        "TrackCreateDate",
        "CreationDate",
    ):
        source = (
            "mp4_utc"
            if key in {"CreateDate", "MediaCreateDate", "TrackCreateDate"}
            else "exif_local"
        )
        capture_metadata = _capture_metadata_from_datetime_text(
            metadata.get(key),
            parent_timezone=parent_timezone,
            source=source,
        )
        if capture_metadata is not None:
            break

    if capture_metadata is None:
        capture_metadata = VideoCaptureMetadata(
            capture_datetime_local=None,
            timezone=parent_timezone,
            capture_datetime_utc=None,
            capture_timezone_source="parent" if parent_timezone else "unknown",
            capture_datetime_source="unknown",
            gps_datetime_utc=None,
            gps_timezone=None,
        )

    return (
        float(gps_latitude) if isinstance(gps_latitude, (int, float)) else None,
        float(gps_longitude) if isinstance(gps_longitude, (int, float)) else None,
        capture_metadata.capture_datetime_local,
        capture_metadata.timezone,
        capture_metadata.capture_datetime_utc,
        capture_metadata.capture_timezone_source,
        capture_metadata.capture_datetime_source,
        capture_metadata.gps_datetime_utc,
        capture_metadata.gps_timezone,
        int(width) if isinstance(width, (int, float)) else None,
        int(height) if isinstance(height, (int, float)) else None,
        float(duration_seconds) if isinstance(duration_seconds, (int, float)) else None,
    )


def _render_jpeg_bytes(image: Image.Image) -> bytes:
    output = BytesIO()
    image.convert("RGB").save(output, format="JPEG", quality=88, optimize=True)
    return output.getvalue()


def _run_ffmpeg_thumbnail_command(command: list[str], output_path: Path) -> str:
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Video thumbnail generation is not available on this server.",
        ) from exc
    except subprocess.CalledProcessError as exc:
        detail = ((exc.stderr or "").strip() or (exc.stdout or "").strip()).strip()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail or "Video thumbnail could not be generated.",
        ) from exc

    if output_path.exists():
        return ((result.stderr or "").strip() or (result.stdout or "").strip()).strip()

    return ((result.stderr or "").strip() or (result.stdout or "").strip()).strip()


def _extract_video_thumbnails(video_path: Path) -> tuple[bytes, bytes]:
    with TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        frame_path = temp_path / "frame.jpg"
        attempts = [
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(video_path),
                "-vf",
                "thumbnail",
                "-frames:v",
                "1",
                str(frame_path),
            ],
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-ss",
                "00:00:01",
                "-i",
                str(video_path),
                "-frames:v",
                "1",
                str(frame_path),
            ],
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-ss",
                "00:00:00",
                "-i",
                str(video_path),
                "-frames:v",
                "1",
                str(frame_path),
            ],
        ]
        last_detail = ""
        for command in attempts:
            if frame_path.exists():
                frame_path.unlink()
            try:
                last_detail = _run_ffmpeg_thumbnail_command(command, frame_path)
            except HTTPException as exc:
                last_detail = str(exc.detail)
                continue
            if frame_path.exists():
                break

        if not frame_path.exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=last_detail or "Video thumbnail could not be generated.",
            )

        with Image.open(frame_path) as source_image:
            source_image.load()
            thumbnail_image = source_image.copy()
            thumbnail_image.thumbnail(THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)
            tiny_thumbnail_image = source_image.copy()
            tiny_thumbnail_image.thumbnail(TINY_THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)
            return _render_jpeg_bytes(thumbnail_image), _render_jpeg_bytes(tiny_thumbnail_image)


async def create_uploaded_video(
    *,
    upload: UploadFile,
    storage_prefix: str,
    parent_timezone: str | None = None,
) -> UploadedVideoPayload:
    try:
        content_type = (upload.content_type or "").strip().lower()
        extension = SUPPORTED_VIDEO_CONTENT_TYPES.get(content_type)

        filename_extension = _normalized_extension(upload.filename)
        if extension is None and filename_extension in SUPPORTED_VIDEO_EXTENSIONS:
            extension = filename_extension.lstrip(".")

        if extension is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported video file. Use MP4, MOV, AVI, MPEG, 3GP, OGV, or WEBM.",
            )

        if not content_type:
            content_type = mimetypes.guess_type(f"video.{extension}")[0] or "video/mp4"

        object_id = uuid4().hex
        original_storage_path = f"{storage_prefix}/{object_id}.{extension}"
        thumbnail_storage_path = f"{storage_prefix}/{object_id}_thumb.jpg"
        tiny_thumbnail_storage_path = f"{storage_prefix}/{object_id}_tiny.jpg"

        with TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            video_path = temp_path / f"source.{extension}"

            total_bytes = 0
            with video_path.open("wb") as destination:
                while True:
                    chunk = await upload.read(UPLOAD_CHUNK_SIZE)
                    if not chunk:
                        break
                    destination.write(chunk)
                    total_bytes += len(chunk)

            if total_bytes == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty"
                )

            (
                gps_latitude,
                gps_longitude,
                capture_datetime_local,
                video_timezone,
                capture_datetime_utc,
                capture_timezone_source,
                capture_datetime_source,
                gps_datetime_utc,
                gps_timezone,
                width,
                height,
                duration_seconds,
            ) = _extract_video_metadata(video_path, parent_timezone=parent_timezone)
            thumbnail_bytes, tiny_thumbnail_bytes = _extract_video_thumbnails(video_path)

            uploaded_paths: list[str] = []
            try:
                original_video_url = firebase_storage.upload_file(
                    path=original_storage_path,
                    local_path=video_path,
                    content_type=content_type,
                    download_token=str(uuid4()),
                )
                uploaded_paths.append(original_storage_path)
                thumbnail_url = firebase_storage.upload_bytes(
                    path=thumbnail_storage_path,
                    data=thumbnail_bytes,
                    content_type=THUMBNAIL_CONTENT_TYPE,
                    download_token=str(uuid4()),
                )
                uploaded_paths.append(thumbnail_storage_path)
                tiny_thumbnail_url = firebase_storage.upload_bytes(
                    path=tiny_thumbnail_storage_path,
                    data=tiny_thumbnail_bytes,
                    content_type=THUMBNAIL_CONTENT_TYPE,
                    download_token=str(uuid4()),
                )
                uploaded_paths.append(tiny_thumbnail_storage_path)
            except Exception:
                for path in uploaded_paths:
                    try:
                        firebase_storage.delete_object(path)
                    except Exception:
                        continue
                raise
    finally:
        await upload.close()

    return UploadedVideoPayload(
        original_storage_path=original_storage_path,
        compressed_storage_path=None,
        thumbnail_storage_path=thumbnail_storage_path,
        tiny_thumbnail_storage_path=tiny_thumbnail_storage_path,
        original_video_url=original_video_url,
        compressed_video_url=None,
        thumbnail_url=thumbnail_url,
        tiny_thumbnail_url=tiny_thumbnail_url,
        width=width,
        height=height,
        duration_seconds=duration_seconds,
        content_type=content_type,
        original_filename=upload.filename,
        gps_latitude=gps_latitude,
        gps_longitude=gps_longitude,
        capture_datetime_local=capture_datetime_local,
        timezone=video_timezone,
        capture_datetime_utc=capture_datetime_utc,
        capture_timezone_source=capture_timezone_source,
        capture_datetime_source=capture_datetime_source,
        gps_datetime_utc=gps_datetime_utc,
        gps_timezone=gps_timezone,
    )


def delete_uploaded_video_files(
    *,
    original_storage_path: str,
    compressed_storage_path: str | None = None,
    thumbnail_storage_path: str | None = None,
    tiny_thumbnail_storage_path: str | None = None,
) -> None:
    for path in (
        original_storage_path,
        compressed_storage_path,
        thumbnail_storage_path,
        tiny_thumbnail_storage_path,
    ):
        if not path:
            continue
        try:
            firebase_storage.delete_object(path)
        except Exception:
            continue
