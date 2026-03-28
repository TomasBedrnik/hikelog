from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.services.firebase_storage import firebase_storage

THUMBNAIL_MAX_SIZE = (480, 480)
SUPPORTED_IMAGE_FORMATS = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
}


@dataclass(slots=True)
class UploadedImagePayload:
    storage_path: str
    thumbnail_storage_path: str
    image_url: str
    thumbnail_url: str
    width: int
    height: int
    thumbnail_width: int
    thumbnail_height: int
    content_type: str
    original_filename: str | None


def _normalize_image_for_format(image: Image.Image, image_format: str) -> Image.Image:
    if image_format == "JPEG":
        if image.mode == "RGB":
            return image
        if "A" in image.getbands():
            background = Image.new("RGB", image.size, "white")
            background.paste(image, mask=image.getchannel("A"))
            return background
        return image.convert("RGB")

    if image_format == "PNG" and image.mode not in {"RGB", "RGBA", "L", "LA", "P"}:
        return image.convert("RGBA")

    return image


def _save_image_bytes(image: Image.Image, image_format: str) -> bytes:
    output = BytesIO()
    save_kwargs = {"format": image_format}
    if image_format == "JPEG":
        save_kwargs["quality"] = 90
        save_kwargs["optimize"] = True
    image.save(output, **save_kwargs)
    return output.getvalue()


async def create_uploaded_image(
    *,
    upload: UploadFile,
    resize_mode: str,
    resize_width: int | None,
    resize_height: int | None,
    storage_prefix: str,
) -> UploadedImagePayload:
    payload = await upload.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    try:
        source_image = Image.open(BytesIO(payload))
        source_image.load()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image file") from exc

    image_format = (source_image.format or "").upper()
    if image_format not in SUPPORTED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG and PNG images are supported",
        )

    extension, content_type = SUPPORTED_IMAGE_FORMATS[image_format]
    original_image = _normalize_image_for_format(source_image, image_format)

    if resize_mode == "resize":
        resized_image = original_image.copy()
        resized_image.thumbnail((resize_width, resize_height), Image.Resampling.LANCZOS)
        original_image = resized_image

    thumbnail_image = original_image.copy()
    thumbnail_image.thumbnail(THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)

    original_bytes = _save_image_bytes(original_image, image_format)
    thumbnail_bytes = _save_image_bytes(thumbnail_image, image_format)

    object_id = uuid4().hex
    storage_path = f"{storage_prefix}/{object_id}.{extension}"
    thumbnail_storage_path = f"{storage_prefix}/{object_id}_thumb.{extension}"

    image_url = firebase_storage.upload_bytes(
        path=storage_path,
        data=original_bytes,
        content_type=content_type,
        download_token=str(uuid4()),
    )
    thumbnail_url = firebase_storage.upload_bytes(
        path=thumbnail_storage_path,
        data=thumbnail_bytes,
        content_type=content_type,
        download_token=str(uuid4()),
    )

    return UploadedImagePayload(
        storage_path=storage_path,
        thumbnail_storage_path=thumbnail_storage_path,
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        width=original_image.width,
        height=original_image.height,
        thumbnail_width=thumbnail_image.width,
        thumbnail_height=thumbnail_image.height,
        content_type=content_type,
        original_filename=upload.filename,
    )


def delete_uploaded_image_files(*, storage_path: str, thumbnail_storage_path: str) -> None:
    for path in (storage_path, thumbnail_storage_path):
        try:
            firebase_storage.delete_object(path)
        except Exception:
            continue
