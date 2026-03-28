from __future__ import annotations

from io import BytesIO
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.admin_user import AdminUser
from app.models.gallery_image import GalleryImage
from app.schemas.gallery_image import GalleryImageRead
from app.services.firebase_storage import firebase_storage

router = APIRouter()
THUMBNAIL_MAX_SIZE = (480, 480)
SUPPORTED_IMAGE_FORMATS = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
}


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


async def _create_gallery_image(
    *,
    upload: UploadFile,
    resize_mode: str,
    resize_width: int | None,
    resize_height: int | None,
) -> GalleryImage:
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
    storage_path = f"gallery/{object_id}.{extension}"
    thumbnail_storage_path = f"gallery/{object_id}_thumb.{extension}"

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

    return GalleryImage(
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


def _delete_gallery_image_files(image: GalleryImage) -> None:
    for path in (image.storage_path, image.thumbnail_storage_path):
        try:
            firebase_storage.delete_object(path)
        except Exception:
            continue


@router.get("", response_model=list[GalleryImageRead])
async def list_gallery_images(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[GalleryImageRead]:
    stmt = select(GalleryImage).order_by(GalleryImage.created_at.desc(), GalleryImage.id.desc())
    images = (await session.scalars(stmt)).all()
    return [GalleryImageRead.model_validate(image) for image in images]


@router.post("", response_model=list[GalleryImageRead], status_code=status.HTTP_201_CREATED)
async def upload_gallery_images(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    files: Annotated[list[UploadFile], File(...)],
    resize_mode: Annotated[str, Form()] = "keep",
    resize_width: Annotated[int | None, Form()] = None,
    resize_height: Annotated[int | None, Form()] = None,
) -> list[GalleryImageRead]:
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files were uploaded")

    if resize_mode not in {"keep", "resize"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resize mode")

    if resize_mode == "resize" and (
        resize_width is None or resize_height is None or resize_width <= 0 or resize_height <= 0
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resize width and height must be positive integers",
        )

    created_images: list[GalleryImage] = []
    try:
        for file in files:
            image = await _create_gallery_image(
                upload=file,
                resize_mode=resize_mode,
                resize_width=resize_width,
                resize_height=resize_height,
            )
            session.add(image)
            created_images.append(image)

        await session.commit()
    except Exception:
        await session.rollback()
        for image in created_images:
            _delete_gallery_image_files(image)
        raise

    for image in created_images:
        await session.refresh(image)

    return [GalleryImageRead.model_validate(image) for image in created_images]


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gallery_image(
    image_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    image = await session.get(GalleryImage, image_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery image not found")

    _delete_gallery_image_files(image)
    await session.delete(image)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
