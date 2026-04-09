from __future__ import annotations

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.admin_user import AdminUser
from app.models.global_content import GlobalContent
from app.schemas.global_content import GlobalContentAdminRead, GlobalContentUpdate
from app.services.image_uploads import (
    create_uploaded_image,
    delete_uploaded_image_files,
    rotate_uploaded_image,
)

router = APIRouter()


def _to_global_content_admin_read(global_content: GlobalContent) -> GlobalContentAdminRead:
    return GlobalContentAdminRead.model_validate(global_content)


async def _get_or_create_global_content(session: AsyncSession) -> GlobalContent:
    stmt = select(GlobalContent).order_by(GlobalContent.id.asc())
    global_content = (await session.scalars(stmt)).first()
    if global_content is not None:
        return global_content

    global_content = GlobalContent()
    session.add(global_content)
    await session.commit()
    await session.refresh(global_content)
    return global_content


def _delete_hero_image_files(global_content: GlobalContent) -> None:
    delete_uploaded_image_files(
        storage_path=global_content.hero_storage_path or "",
        thumbnail_storage_path=global_content.hero_thumbnail_storage_path or "",
        tiny_thumbnail_storage_path=global_content.hero_tiny_thumbnail_storage_path,
    )


def _assign_uploaded_image(global_content: GlobalContent, uploaded: dict[str, object]) -> None:
    global_content.hero_storage_path = uploaded["storage_path"]  # type: ignore[assignment]
    global_content.hero_thumbnail_storage_path = uploaded["thumbnail_storage_path"]  # type: ignore[assignment]
    global_content.hero_tiny_thumbnail_storage_path = uploaded["tiny_thumbnail_storage_path"]  # type: ignore[assignment]
    global_content.hero_image_url = uploaded["image_url"]  # type: ignore[assignment]
    global_content.hero_thumbnail_url = uploaded["thumbnail_url"]  # type: ignore[assignment]
    global_content.hero_tiny_thumbnail_url = uploaded["tiny_thumbnail_url"]  # type: ignore[assignment]
    global_content.hero_width = uploaded["width"]  # type: ignore[assignment]
    global_content.hero_height = uploaded["height"]  # type: ignore[assignment]
    global_content.hero_thumbnail_width = uploaded["thumbnail_width"]  # type: ignore[assignment]
    global_content.hero_thumbnail_height = uploaded["thumbnail_height"]  # type: ignore[assignment]
    global_content.hero_tiny_thumbnail_width = uploaded["tiny_thumbnail_width"]  # type: ignore[assignment]
    global_content.hero_tiny_thumbnail_height = uploaded["tiny_thumbnail_height"]  # type: ignore[assignment]
    global_content.hero_content_type = uploaded["content_type"]  # type: ignore[assignment]
    global_content.hero_original_filename = uploaded["original_filename"]  # type: ignore[assignment]


@router.get("", response_model=GlobalContentAdminRead)
async def get_global_content(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GlobalContentAdminRead:
    global_content = await _get_or_create_global_content(session)
    return _to_global_content_admin_read(global_content)


@router.patch("", response_model=GlobalContentAdminRead)
async def update_global_content(
    payload: GlobalContentUpdate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GlobalContentAdminRead:
    global_content = await _get_or_create_global_content(session)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(global_content, field, value)

    await session.commit()
    await session.refresh(global_content)
    return _to_global_content_admin_read(global_content)


@router.post(
    "/hero-image",
    response_model=GlobalContentAdminRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_global_content_hero_image(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: Annotated[UploadFile, File(...)],
    resize_mode: Annotated[str, Form()] = "keep",
    resize_width: Annotated[int | None, Form()] = None,
    resize_height: Annotated[int | None, Form()] = None,
) -> GlobalContentAdminRead:
    global_content = await _get_or_create_global_content(session)

    if resize_mode not in {"keep", "resize"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resize mode")

    if resize_mode == "resize" and (
        resize_width is None or resize_height is None or resize_width <= 0 or resize_height <= 0
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resize width and height must be positive integers",
        )

    previous_paths = (
        global_content.hero_storage_path,
        global_content.hero_thumbnail_storage_path,
        global_content.hero_tiny_thumbnail_storage_path,
    )

    uploaded = await create_uploaded_image(
        upload=file,
        resize_mode=resize_mode,
        resize_width=resize_width,
        resize_height=resize_height,
        storage_prefix="global-content",
    )

    try:
        _assign_uploaded_image(global_content, asdict(uploaded))
        await session.commit()
        await session.refresh(global_content)
    except Exception:
        await session.rollback()
        delete_uploaded_image_files(
            storage_path=uploaded.storage_path,
            thumbnail_storage_path=uploaded.thumbnail_storage_path,
            tiny_thumbnail_storage_path=uploaded.tiny_thumbnail_storage_path,
        )
        raise

    old_storage_path, old_thumbnail_path, old_tiny_path = previous_paths
    if old_storage_path and old_thumbnail_path:
        delete_uploaded_image_files(
            storage_path=old_storage_path,
            thumbnail_storage_path=old_thumbnail_path,
            tiny_thumbnail_storage_path=old_tiny_path,
        )

    return _to_global_content_admin_read(global_content)


@router.delete("/hero-image", response_model=GlobalContentAdminRead)
async def delete_global_content_hero_image(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GlobalContentAdminRead:
    global_content = await _get_or_create_global_content(session)
    previous_paths = (
        global_content.hero_storage_path,
        global_content.hero_thumbnail_storage_path,
        global_content.hero_tiny_thumbnail_storage_path,
    )

    global_content.hero_storage_path = None
    global_content.hero_thumbnail_storage_path = None
    global_content.hero_tiny_thumbnail_storage_path = None
    global_content.hero_image_url = None
    global_content.hero_thumbnail_url = None
    global_content.hero_tiny_thumbnail_url = None
    global_content.hero_width = None
    global_content.hero_height = None
    global_content.hero_thumbnail_width = None
    global_content.hero_thumbnail_height = None
    global_content.hero_tiny_thumbnail_width = None
    global_content.hero_tiny_thumbnail_height = None
    global_content.hero_content_type = None
    global_content.hero_original_filename = None

    await session.commit()
    await session.refresh(global_content)

    old_storage_path, old_thumbnail_path, old_tiny_path = previous_paths
    if old_storage_path and old_thumbnail_path:
        delete_uploaded_image_files(
            storage_path=old_storage_path,
            thumbnail_storage_path=old_thumbnail_path,
            tiny_thumbnail_storage_path=old_tiny_path,
        )

    return _to_global_content_admin_read(global_content)


@router.patch("/hero-image/rotate", response_model=GlobalContentAdminRead)
async def rotate_global_content_hero_image(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GlobalContentAdminRead:
    global_content = await _get_or_create_global_content(session)
    if not global_content.hero_storage_path or not global_content.hero_thumbnail_storage_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hero image not found")

    rotated = rotate_uploaded_image(
        storage_path=global_content.hero_storage_path,
        thumbnail_storage_path=global_content.hero_thumbnail_storage_path,
        tiny_thumbnail_storage_path=global_content.hero_tiny_thumbnail_storage_path,
        image_url=global_content.hero_image_url or "",
        thumbnail_url=global_content.hero_thumbnail_url or "",
        tiny_thumbnail_url=global_content.hero_tiny_thumbnail_url,
        content_type=global_content.hero_content_type or "image/jpeg",
        original_filename=global_content.hero_original_filename,
        gps_latitude=None,
        gps_longitude=None,
    )

    _assign_uploaded_image(global_content, asdict(rotated))
    await session.commit()
    await session.refresh(global_content)
    return _to_global_content_admin_read(global_content)
