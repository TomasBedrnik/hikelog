from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from PIL import ExifTags, Image, ImageOps, UnidentifiedImageError

from app.services.firebase_storage import firebase_storage

THUMBNAIL_MAX_SIZE = (480, 480)
TINY_THUMBNAIL_MAX_SIZE = (96, 96)
GPS_IFD = getattr(ExifTags.IFD, "GPSInfo", 34853)
GPS_LATITUDE_REF = 1
GPS_LATITUDE = 2
GPS_LONGITUDE_REF = 3
GPS_LONGITUDE = 4
SUPPORTED_IMAGE_FORMATS = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
}
CONTENT_TYPE_TO_IMAGE_FORMAT = {
    content_type: image_format
    for image_format, (_, content_type) in SUPPORTED_IMAGE_FORMATS.items()
}


@dataclass(slots=True)
class UploadedImagePayload:
    storage_path: str
    thumbnail_storage_path: str
    tiny_thumbnail_storage_path: str | None
    image_url: str
    thumbnail_url: str
    tiny_thumbnail_url: str | None
    width: int
    height: int
    thumbnail_width: int
    thumbnail_height: int
    tiny_thumbnail_width: int | None
    tiny_thumbnail_height: int | None
    content_type: str
    original_filename: str | None
    gps_latitude: float | None
    gps_longitude: float | None


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


def _resize_with_no_upscale(
    image: Image.Image,
    *,
    max_width: int | None,
    max_height: int | None,
) -> Image.Image:
    if max_width is None or max_height is None:
        return image

    scale = min(max_width / image.width, max_height / image.height)
    if scale >= 1:
        return image

    next_size = (
        max(1, int(image.width * scale)),
        max(1, int(image.height * scale)),
    )
    return image.resize(next_size, Image.Resampling.LANCZOS)


def _decode_gps_ref(value: object) -> str | None:
    if isinstance(value, bytes):
        return value.decode("ascii", errors="ignore").strip().upper() or None
    if isinstance(value, str):
        return value.strip().upper() or None
    return None


def _rational_to_float(value: object) -> float | None:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        pass

    if isinstance(value, tuple) and len(value) == 2:
        numerator, denominator = value
        try:
            denominator_value = float(denominator)
            if denominator_value == 0:
                return None
            return float(numerator) / denominator_value
        except (TypeError, ValueError, ZeroDivisionError):
            return None

    return None


def _convert_gps_to_decimal(values: object, ref: object) -> float | None:
    if not isinstance(values, (list, tuple)) or len(values) != 3:
        return None

    degrees = _rational_to_float(values[0])
    minutes = _rational_to_float(values[1])
    seconds = _rational_to_float(values[2])
    direction = _decode_gps_ref(ref)

    if degrees is None or minutes is None or seconds is None or direction is None:
        return None

    decimal = degrees + (minutes / 60) + (seconds / 3600)
    if direction in {"S", "W"}:
        decimal *= -1
    return decimal


def _extract_gps_coordinates(image: Image.Image) -> tuple[float | None, float | None]:
    exif = image.getexif()
    if not exif:
        return None, None

    gps_info: dict[object, object] | None = None
    if hasattr(exif, "get_ifd"):
        try:
            gps_info = exif.get_ifd(GPS_IFD)
        except KeyError:
            gps_info = None
    if not gps_info:
        gps_info = exif.get(GPS_IFD)
    if not isinstance(gps_info, dict):
        return None, None

    latitude = _convert_gps_to_decimal(gps_info.get(GPS_LATITUDE), gps_info.get(GPS_LATITUDE_REF))
    longitude = _convert_gps_to_decimal(
        gps_info.get(GPS_LONGITUDE), gps_info.get(GPS_LONGITUDE_REF)
    )
    return latitude, longitude


def _build_storage_path(storage_prefix: str, object_id: str, suffix: str, extension: str) -> str:
    return f"{storage_prefix}/{object_id}{suffix}.{extension}"


async def create_uploaded_image(
    *,
    upload: UploadFile,
    resize_mode: str,
    resize_width: int | None,
    resize_height: int | None,
    storage_prefix: str,
    create_thumbnails: bool = True,
) -> UploadedImagePayload:
    payload = await upload.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty"
        )

    try:
        source_image = Image.open(BytesIO(payload))
        source_image.load()
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image file"
        ) from exc

    image_format = (source_image.format or "").upper()
    if image_format not in SUPPORTED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG and PNG images are supported",
        )

    extension, content_type = SUPPORTED_IMAGE_FORMATS[image_format]
    gps_latitude, gps_longitude = _extract_gps_coordinates(source_image)
    transposed_image = ImageOps.exif_transpose(source_image)
    original_image = _normalize_image_for_format(transposed_image, image_format)

    if resize_mode == "resize":
        original_image = _resize_with_no_upscale(
            original_image,
            max_width=resize_width,
            max_height=resize_height,
        )

    original_bytes = _save_image_bytes(original_image, image_format)

    object_id = uuid4().hex
    storage_path = _build_storage_path(storage_prefix, object_id, "", extension)
    image_url = firebase_storage.upload_bytes(
        path=storage_path,
        data=original_bytes,
        content_type=content_type,
        download_token=str(uuid4()),
    )
    thumbnail_storage_path: str | None = None
    tiny_thumbnail_storage_path: str | None = None
    thumbnail_url: str | None = None
    tiny_thumbnail_url: str | None = None
    thumbnail_width: int | None = None
    thumbnail_height: int | None = None
    tiny_thumbnail_width: int | None = None
    tiny_thumbnail_height: int | None = None

    if create_thumbnails:
        thumbnail_image = original_image.copy()
        thumbnail_image.thumbnail(THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)
        tiny_thumbnail_image = original_image.copy()
        tiny_thumbnail_image.thumbnail(TINY_THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)
        thumbnail_bytes = _save_image_bytes(thumbnail_image, image_format)
        tiny_thumbnail_bytes = _save_image_bytes(tiny_thumbnail_image, image_format)
        thumbnail_storage_path = _build_storage_path(storage_prefix, object_id, "_thumb", extension)
        tiny_thumbnail_storage_path = _build_storage_path(
            storage_prefix, object_id, "_tiny", extension
        )
        thumbnail_url = firebase_storage.upload_bytes(
            path=thumbnail_storage_path,
            data=thumbnail_bytes,
            content_type=content_type,
            download_token=str(uuid4()),
        )
        tiny_thumbnail_url = firebase_storage.upload_bytes(
            path=tiny_thumbnail_storage_path,
            data=tiny_thumbnail_bytes,
            content_type=content_type,
            download_token=str(uuid4()),
        )
        thumbnail_width = thumbnail_image.width
        thumbnail_height = thumbnail_image.height
        tiny_thumbnail_width = tiny_thumbnail_image.width
        tiny_thumbnail_height = tiny_thumbnail_image.height

    return UploadedImagePayload(
        storage_path=storage_path,
        thumbnail_storage_path=thumbnail_storage_path or "",
        tiny_thumbnail_storage_path=tiny_thumbnail_storage_path,
        image_url=image_url,
        thumbnail_url=thumbnail_url or "",
        tiny_thumbnail_url=tiny_thumbnail_url,
        width=original_image.width,
        height=original_image.height,
        thumbnail_width=thumbnail_width or original_image.width,
        thumbnail_height=thumbnail_height or original_image.height,
        tiny_thumbnail_width=tiny_thumbnail_width,
        tiny_thumbnail_height=tiny_thumbnail_height,
        content_type=content_type,
        original_filename=upload.filename,
        gps_latitude=gps_latitude,
        gps_longitude=gps_longitude,
    )


def delete_uploaded_image_files(
    *,
    storage_path: str,
    thumbnail_storage_path: str,
    tiny_thumbnail_storage_path: str | None = None,
) -> None:
    for path in (storage_path, thumbnail_storage_path, tiny_thumbnail_storage_path):
        if not path:
            continue
        try:
            firebase_storage.delete_object(path)
        except Exception:
            continue


def _extract_download_token(url: str | None) -> str:
    if not url:
        return str(uuid4())
    token = parse_qs(urlparse(url).query).get("token", [None])[0]
    return token or str(uuid4())


def rotate_uploaded_image(
    *,
    storage_path: str,
    thumbnail_storage_path: str | None,
    tiny_thumbnail_storage_path: str | None,
    image_url: str,
    thumbnail_url: str | None,
    tiny_thumbnail_url: str | None,
    content_type: str,
    original_filename: str | None,
    gps_latitude: float | None,
    gps_longitude: float | None,
    direction: str = "right",
    create_thumbnails: bool = True,
) -> UploadedImagePayload:
    image_format = CONTENT_TYPE_TO_IMAGE_FORMAT.get(content_type)
    if image_format is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image content type"
        )

    try:
        original_image = Image.open(BytesIO(firebase_storage.download_bytes(storage_path)))
        original_image.load()
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image file"
        ) from exc

    transpose_operation = (
        Image.Transpose.ROTATE_270 if direction == "right" else Image.Transpose.ROTATE_90
    )
    rotated_image = _normalize_image_for_format(
        original_image.transpose(transpose_operation),
        image_format,
    )
    rotated_bytes = _save_image_bytes(rotated_image, image_format)

    image_token = str(uuid4())

    next_image_url = firebase_storage.upload_bytes(
        path=storage_path,
        data=rotated_bytes,
        content_type=content_type,
        download_token=image_token,
    )
    next_thumbnail_url: str | None = None
    next_tiny_thumbnail_url: str | None = None
    thumbnail_width: int | None = None
    thumbnail_height: int | None = None
    tiny_thumbnail_width: int | None = None
    tiny_thumbnail_height: int | None = None

    if create_thumbnails:
        thumbnail_image = rotated_image.copy()
        thumbnail_image.thumbnail(THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)
        tiny_thumbnail_image = rotated_image.copy()
        tiny_thumbnail_image.thumbnail(TINY_THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)
        thumbnail_bytes = _save_image_bytes(thumbnail_image, image_format)
        tiny_thumbnail_bytes = _save_image_bytes(tiny_thumbnail_image, image_format)
        thumbnail_token = str(uuid4())
        tiny_thumbnail_token = str(uuid4())

        if not thumbnail_storage_path:
            stem, _, extension = storage_path.rpartition(".")
            thumbnail_storage_path = (
                f"{stem}_thumb.{extension}" if extension else f"{storage_path}_thumb"
            )

        if tiny_thumbnail_storage_path is None:
            stem, _, extension = storage_path.rpartition(".")
            tiny_thumbnail_storage_path = (
                f"{stem}_tiny.{extension}" if extension else f"{storage_path}_tiny"
            )

        next_thumbnail_url = firebase_storage.upload_bytes(
            path=thumbnail_storage_path,
            data=thumbnail_bytes,
            content_type=content_type,
            download_token=thumbnail_token,
        )
        next_tiny_thumbnail_url = firebase_storage.upload_bytes(
            path=tiny_thumbnail_storage_path,
            data=tiny_thumbnail_bytes,
            content_type=content_type,
            download_token=tiny_thumbnail_token,
        )
        thumbnail_width = thumbnail_image.width
        thumbnail_height = thumbnail_image.height
        tiny_thumbnail_width = tiny_thumbnail_image.width
        tiny_thumbnail_height = tiny_thumbnail_image.height

    return UploadedImagePayload(
        storage_path=storage_path,
        thumbnail_storage_path=thumbnail_storage_path or "",
        tiny_thumbnail_storage_path=tiny_thumbnail_storage_path,
        image_url=next_image_url,
        thumbnail_url=next_thumbnail_url or "",
        tiny_thumbnail_url=next_tiny_thumbnail_url,
        width=rotated_image.width,
        height=rotated_image.height,
        thumbnail_width=thumbnail_width or rotated_image.width,
        thumbnail_height=thumbnail_height or rotated_image.height,
        tiny_thumbnail_width=tiny_thumbnail_width,
        tiny_thumbnail_height=tiny_thumbnail_height,
        content_type=content_type,
        original_filename=original_filename,
        gps_latitude=gps_latitude,
        gps_longitude=gps_longitude,
    )
