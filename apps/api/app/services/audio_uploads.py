from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
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

    normalized_content_type = (
        content_type
        if content_type.startswith("audio/")
        else {
            "aac": "audio/aac",
            "flac": "audio/flac",
            "m4a": "audio/mp4",
            "mp3": "audio/mpeg",
            "ogg": "audio/ogg",
            "wav": "audio/wav",
            "webm": "audio/webm",
        }[extension]
    )

    storage_path = f"{storage_prefix}/{uuid4().hex}.{extension}"
    audio_url = firebase_storage.upload_bytes(
        path=storage_path,
        data=payload,
        content_type=normalized_content_type,
        download_token=str(uuid4()),
    )
    return UploadedAudioPayload(
        storage_path=storage_path,
        audio_url=audio_url,
        content_type=normalized_content_type,
        original_filename=upload.filename,
    )


def delete_uploaded_audio_file(storage_path: str) -> None:
    if not storage_path:
        return
    try:
        firebase_storage.delete_object(storage_path)
    except Exception:
        return
