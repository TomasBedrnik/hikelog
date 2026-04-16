from __future__ import annotations

import json
import mimetypes
import subprocess
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

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
    capture_datetime: datetime | None


def _normalized_extension(filename: str | None) -> str | None:
    if not filename:
        return None
    suffix = Path(filename).suffix.lower()
    return suffix or None


def _parse_capture_datetime(value: object) -> datetime | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None

    formats = (
        "%Y:%m:%d %H:%M:%S%z",
        "%Y:%m:%d %H:%M:%S",
        "%Y:%m:%d %H:%M:%S.%f%z",
        "%Y:%m:%d %H:%M:%S.%f",
    )
    for fmt in formats:
        try:
            parsed = datetime.strptime(text, fmt)
            if parsed.tzinfo is not None:
                return parsed.astimezone().replace(tzinfo=None)
            return parsed
        except ValueError:
            continue
    return None


def _extract_video_metadata(
    video_path: Path,
) -> tuple[float | None, float | None, datetime | None, int | None, int | None, float | None]:
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
        return None, None, None, None, None, None

    metadata = parsed[0]
    gps_latitude = metadata.get("GPSLatitude")
    gps_longitude = metadata.get("GPSLongitude")
    width = metadata.get("ImageWidth") or metadata.get("SourceImageWidth")
    height = metadata.get("ImageHeight") or metadata.get("SourceImageHeight")
    duration_seconds = metadata.get("Duration")
    capture_datetime = None
    for key in (
        "DateTimeOriginal",
        "CreateDate",
        "MediaCreateDate",
        "TrackCreateDate",
        "CreationDate",
    ):
        capture_datetime = _parse_capture_datetime(metadata.get(key))
        if capture_datetime is not None:
            break

    return (
        float(gps_latitude) if isinstance(gps_latitude, (int, float)) else None,
        float(gps_longitude) if isinstance(gps_longitude, (int, float)) else None,
        capture_datetime,
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


async def create_uploaded_video(*, upload: UploadFile, storage_prefix: str) -> UploadedVideoPayload:
    payload = await upload.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty"
        )

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
        video_path.write_bytes(payload)

        (
            gps_latitude,
            gps_longitude,
            capture_datetime,
            width,
            height,
            duration_seconds,
        ) = _extract_video_metadata(video_path)
        thumbnail_bytes, tiny_thumbnail_bytes = _extract_video_thumbnails(video_path)

    uploaded_paths: list[str] = []
    try:
        original_video_url = firebase_storage.upload_bytes(
            path=original_storage_path,
            data=payload,
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
        capture_datetime=capture_datetime,
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
