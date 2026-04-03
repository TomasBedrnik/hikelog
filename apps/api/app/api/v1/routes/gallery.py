from __future__ import annotations

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.admin_user import AdminUser
from app.models.gallery_image import GalleryImage
from app.schemas.gallery_image import GalleryImageRead
from app.services.image_uploads import (
    create_uploaded_image,
    delete_uploaded_image_files,
    rotate_uploaded_image,
)

router = APIRouter()


def _delete_gallery_image_files(image: GalleryImage) -> None:
    delete_uploaded_image_files(
        storage_path=image.storage_path,
        thumbnail_storage_path=image.thumbnail_storage_path,
        tiny_thumbnail_storage_path=image.tiny_thumbnail_storage_path,
    )


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No files were uploaded"
        )

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
            uploaded = await create_uploaded_image(
                upload=file,
                resize_mode=resize_mode,
                resize_width=resize_width,
                resize_height=resize_height,
                storage_prefix="gallery",
            )
            image = GalleryImage(**asdict(uploaded))
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


@router.patch("/{image_id}/rotate", response_model=GalleryImageRead)
async def rotate_gallery_image(
    image_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GalleryImageRead:
    image = await session.get(GalleryImage, image_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery image not found")

    rotated = rotate_uploaded_image(
        storage_path=image.storage_path,
        thumbnail_storage_path=image.thumbnail_storage_path,
        tiny_thumbnail_storage_path=image.tiny_thumbnail_storage_path,
        image_url=image.image_url,
        thumbnail_url=image.thumbnail_url,
        tiny_thumbnail_url=image.tiny_thumbnail_url,
        content_type=image.content_type,
        original_filename=image.original_filename,
        gps_latitude=image.gps_latitude,
        gps_longitude=image.gps_longitude,
    )

    for field, value in asdict(rotated).items():
        setattr(image, field, value)

    await session.commit()
    await session.refresh(image)
    return GalleryImageRead.model_validate(image)
