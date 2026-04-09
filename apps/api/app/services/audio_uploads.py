from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.services.firebase_storage import firebase_storage

SUPPORTED_AUDIO_EXTENSIONS = {
    ".aac",
    ".flac",
    ".m4a",
    ".mp3",
    ".mp4",
    ".oga",
    ".ogg",
    ".wav",
    ".webm",
}
SUPPORTED_AUDIO_CONTENT_TYPES = {
    "audio/aac": "aac",
    "audio/flac": "flac",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/x-flac": "flac",
    "audio/x-m4a": "m4a",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
}
CONVERTED_AUDIO_CONTENT_TYPE = "audio/flac"
CONVERTED_AUDIO_EXTENSION = "flac"


@dataclass(slots=True)
class UploadedAudioPayload:
    storage_path: str
    audio_url: str
    content_type: str
    original_filename: str | None


def _normalized_extension(filename: str | None) -> str | None:
    if not filename:
        return None
    suffix = Path(filename).suffix.lower()
    return suffix or None


def _converted_audio_payload(payload: bytes, *, extension: str) -> bytes:
    with TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        input_path = temp_path / f"input.{extension}"
        output_path = temp_path / "output.flac"
        input_path.write_bytes(payload)

        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-i",
                    str(input_path),
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    str(output_path),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Audio conversion is not available on this server.",
            ) from exc
        except subprocess.CalledProcessError as exc:
            detail = (exc.stderr or "").strip()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail or "Audio file could not be converted.",
            ) from exc

        converted = output_path.read_bytes()
        if not converted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio file could not be converted.",
            )
        return converted


async def create_uploaded_audio(*, upload: UploadFile, storage_prefix: str) -> UploadedAudioPayload:
    payload = await upload.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty"
        )

    content_type = (upload.content_type or "").strip().lower()
    extension = SUPPORTED_AUDIO_CONTENT_TYPES.get(content_type)

    filename_extension = _normalized_extension(upload.filename)
    if extension is None and filename_extension in SUPPORTED_AUDIO_EXTENSIONS:
        extension = filename_extension.lstrip(".")

    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported audio file. Use MP3, WAV, M4A, OGG, AAC, FLAC, or WEBM.",
        )

    converted_payload = _converted_audio_payload(payload, extension=extension)

    storage_path = f"{storage_prefix}/{uuid4().hex}.{CONVERTED_AUDIO_EXTENSION}"
    audio_url = firebase_storage.upload_bytes(
        path=storage_path,
        data=converted_payload,
        content_type=CONVERTED_AUDIO_CONTENT_TYPE,
        download_token=str(uuid4()),
    )
    return UploadedAudioPayload(
        storage_path=storage_path,
        audio_url=audio_url,
        content_type=CONVERTED_AUDIO_CONTENT_TYPE,
        original_filename=upload.filename,
    )


def delete_uploaded_audio_file(storage_path: str) -> None:
    if not storage_path:
        return
    try:
        firebase_storage.delete_object(storage_path)
    except Exception:
        return
