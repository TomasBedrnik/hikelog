from __future__ import annotations

from dataclasses import asdict
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.activity import Activity
from app.models.activity_comment import ActivityComment
from app.models.activity_photo import ActivityPhoto
from app.models.admin_user import AdminUser
from app.models.trip import Trip
from app.schemas.activity import ActivityCreate, ActivityRead, ActivityUpdate
from app.schemas.activity_photo import ActivityPhotoOrderUpdate, ActivityPhotoRead
from app.schemas.comment import CommentRead
from app.services.gpx_polylines import build_polylines_from_gpx
from app.services.image_uploads import (
    create_uploaded_image,
    delete_uploaded_image_files,
    rotate_uploaded_image,
)

router = APIRouter()


def _to_activity_read(activity: Activity) -> ActivityRead:
    return ActivityRead.model_validate(
        {
            **ActivityRead.model_validate(activity).model_dump(),
            "trip_name": activity.trip.name if activity.trip else None,
        }
    )


async def _get_trip_or_404(session: AsyncSession, trip_id: int) -> Trip:
    trip = await session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


async def _get_activity_or_404(session: AsyncSession, activity_id: int) -> Activity:
    stmt = (
        select(Activity)
        .options(selectinload(Activity.trip), selectinload(Activity.comments), selectinload(Activity.photos))
        .where(Activity.id == activity_id)
    )
    activity = (await session.scalars(stmt)).first()
    if activity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


@router.get("", response_model=list[ActivityRead])
async def list_activities(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ActivityRead]:
    stmt = (
        select(Activity)
        .options(selectinload(Activity.trip), selectinload(Activity.comments), selectinload(Activity.photos))
        .order_by(
            Activity.start_date.desc().nullslast(),
            Activity.created_at.desc(),
            Activity.id.desc(),
        )
    )
    activities = (await session.scalars(stmt)).all()
    return [_to_activity_read(activity) for activity in activities]


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
async def create_activity(
    payload: ActivityCreate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ActivityRead:
    await _get_trip_or_404(session, payload.trip_id)
    activity = Activity(**payload.model_dump())
    session.add(activity)
    await session.commit()
    activity = await _get_activity_or_404(session, activity.id)
    return _to_activity_read(activity)


@router.get("/{activity_id}", response_model=ActivityRead)
async def get_activity(
    activity_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ActivityRead:
    activity = await _get_activity_or_404(session, activity_id)
    return _to_activity_read(activity)


@router.patch("/{activity_id}", response_model=ActivityRead)
async def update_activity(
    activity_id: int,
    payload: ActivityUpdate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ActivityRead:
    activity = await _get_activity_or_404(session, activity_id)
    values = payload.model_dump(exclude_unset=True)

    if "trip_id" in values and values["trip_id"] is not None:
        await _get_trip_or_404(session, values["trip_id"])

    for field, value in values.items():
        setattr(activity, field, value)

    await session.commit()
    activity = await _get_activity_or_404(session, activity_id)
    return _to_activity_read(activity)


@router.post("/{activity_id}/gpx", response_model=ActivityRead)
async def upload_activity_gpx(
    activity_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: Annotated[UploadFile, File(...)],
) -> ActivityRead:
    activity = await _get_activity_or_404(session, activity_id)

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded GPX file is empty")

    polyline, summary_polyline = build_polylines_from_gpx(payload)
    activity.polyline = polyline
    activity.summary_polyline = summary_polyline

    await session.commit()
    activity = await _get_activity_or_404(session, activity_id)
    return _to_activity_read(activity)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    activity = await session.get(Activity, activity_id)
    if activity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")

    await session.delete(activity)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _delete_activity_photo_files(photo: ActivityPhoto) -> None:
    delete_uploaded_image_files(
        storage_path=photo.storage_path,
        thumbnail_storage_path=photo.thumbnail_storage_path,
        tiny_thumbnail_storage_path=photo.tiny_thumbnail_storage_path,
    )


@router.post("/{activity_id}/photos", response_model=list[ActivityPhotoRead], status_code=status.HTTP_201_CREATED)
async def upload_activity_photos(
    activity_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    files: Annotated[list[UploadFile], File(...)],
    resize_mode: Annotated[str, Form()] = "keep",
    resize_width: Annotated[int | None, Form()] = None,
    resize_height: Annotated[int | None, Form()] = None,
) -> list[ActivityPhotoRead]:
    await _get_activity_or_404(session, activity_id)

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

    current_max_position = await session.scalar(
        select(func.max(ActivityPhoto.position)).where(ActivityPhoto.activity_id == activity_id)
    )
    next_position = (current_max_position or 0) + 1 if current_max_position is not None else 0

    created_photos: list[ActivityPhoto] = []
    try:
        for file in files:
            uploaded = await create_uploaded_image(
                upload=file,
                resize_mode=resize_mode,
                resize_width=resize_width,
                resize_height=resize_height,
                storage_prefix=f"activities/{activity_id}",
            )
            photo = ActivityPhoto(
                activity_id=activity_id,
                position=next_position,
                **asdict(uploaded),
            )
            next_position += 1
            session.add(photo)
            created_photos.append(photo)

        await session.commit()
    except Exception:
        await session.rollback()
        for photo in created_photos:
            _delete_activity_photo_files(photo)
        raise

    for photo in created_photos:
        await session.refresh(photo)

    return [ActivityPhotoRead.model_validate(photo) for photo in created_photos]


@router.delete("/{activity_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity_photo(
    activity_id: int,
    photo_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    photo = await session.get(ActivityPhoto, photo_id)
    if photo is None or photo.activity_id != activity_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity photo not found")

    _delete_activity_photo_files(photo)
    await session.delete(photo)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{activity_id}/photos/order", response_model=list[ActivityPhotoRead])
async def reorder_activity_photos(
    activity_id: int,
    payload: ActivityPhotoOrderUpdate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ActivityPhotoRead]:
    stmt = (
        select(ActivityPhoto)
        .where(ActivityPhoto.activity_id == activity_id)
        .order_by(ActivityPhoto.position.asc(), ActivityPhoto.created_at.asc(), ActivityPhoto.id.asc())
    )
    photos = list((await session.scalars(stmt)).all())
    if not photos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity has no photos")

    current_ids = [photo.id for photo in photos]
    ordered_ids = payload.ordered_photo_ids
    if len(ordered_ids) != len(current_ids) or set(ordered_ids) != set(current_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Photo order does not match activity photos")

    photos_by_id = {photo.id: photo for photo in photos}
    for index, photo_id in enumerate(ordered_ids):
        photos_by_id[photo_id].position = index

    await session.commit()
    ordered_photos = [photos_by_id[photo_id] for photo_id in ordered_ids]
    return [ActivityPhotoRead.model_validate(photo) for photo in ordered_photos]


@router.patch("/{activity_id}/photos/{photo_id}/rotate", response_model=ActivityPhotoRead)
async def rotate_activity_photo(
    activity_id: int,
    photo_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    direction: Annotated[str, Query(pattern="^(left|right)$")] = "right",
) -> ActivityPhotoRead:
    photo = await session.get(ActivityPhoto, photo_id)
    if photo is None or photo.activity_id != activity_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity photo not found")

    rotated = rotate_uploaded_image(
        storage_path=photo.storage_path,
        thumbnail_storage_path=photo.thumbnail_storage_path,
        tiny_thumbnail_storage_path=photo.tiny_thumbnail_storage_path,
        image_url=photo.image_url,
        thumbnail_url=photo.thumbnail_url,
        tiny_thumbnail_url=photo.tiny_thumbnail_url,
        content_type=photo.content_type,
        original_filename=photo.original_filename,
        gps_latitude=photo.gps_latitude,
        gps_longitude=photo.gps_longitude,
        direction=direction,
    )

    for field, value in asdict(rotated).items():
        setattr(photo, field, value)

    await session.commit()
    await session.refresh(photo)
    return ActivityPhotoRead.model_validate(photo)


@router.delete("/{activity_id}/comments/{comment_id}", response_model=CommentRead)
async def delete_activity_comment(
    activity_id: int,
    comment_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CommentRead:
    comment = await session.get(ActivityComment, comment_id)
    if comment is None or comment.activity_id != activity_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity comment not found")

    payload = CommentRead.model_validate(comment)
    await session.delete(comment)
    await session.commit()
    return payload
