from __future__ import annotations

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.admin_user import AdminUser
from app.models.trip import Trip
from app.models.trip_comment import TripComment
from app.models.trip_image import TripImage
from app.schemas.comment import CommentRead
from app.schemas.trip import TripCreate, TripRead, TripUpdate
from app.schemas.trip_image import TripImageOrderUpdate, TripImageRead
from app.services.gpx_polylines import build_trip_polyline_from_gpx
from app.services.image_uploads import (
    create_uploaded_image,
    delete_uploaded_image_files,
    rotate_uploaded_image,
)

router = APIRouter()


def _non_activity_image_payload(uploaded: object) -> dict[str, object]:
    payload = asdict(uploaded)
    payload.pop("capture_datetime_local", None)
    payload.pop("timezone", None)
    payload.pop("capture_datetime_utc", None)
    payload.pop("capture_timezone_source", None)
    payload.pop("capture_datetime_source", None)
    payload.pop("gps_datetime_utc", None)
    payload.pop("gps_timezone", None)
    return payload


def _to_trip_read(trip: Trip) -> TripRead:
    return TripRead.model_validate(trip)


async def _get_trip_or_404(session: AsyncSession, trip_id: int) -> Trip:
    stmt = (
        select(Trip)
        .options(selectinload(Trip.comments), selectinload(Trip.images))
        .where(Trip.id == trip_id)
    )
    trip = (await session.scalars(stmt)).first()
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


@router.get("", response_model=list[TripRead])
async def list_trips(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TripRead]:
    stmt = (
        select(Trip)
        .options(selectinload(Trip.comments), selectinload(Trip.images))
        .order_by(Trip.start_date.desc().nullslast(), Trip.created_at.desc())
    )
    trips = (await session.scalars(stmt)).all()
    return [_to_trip_read(trip) for trip in trips]


@router.post("", response_model=TripRead, status_code=status.HTTP_201_CREATED)
async def create_trip(
    payload: TripCreate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    trip = Trip(**payload.model_dump())
    session.add(trip)
    await session.commit()
    trip = await _get_trip_or_404(session, trip.id)
    return _to_trip_read(trip)


@router.get("/{trip_id}", response_model=TripRead)
async def get_trip(
    trip_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    trip = await _get_trip_or_404(session, trip_id)
    return _to_trip_read(trip)


@router.patch("/{trip_id}", response_model=TripRead)
async def update_trip(
    trip_id: int,
    payload: TripUpdate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    trip = await _get_trip_or_404(session, trip_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(trip, field, value)

    await session.commit()
    trip = await _get_trip_or_404(session, trip_id)
    return _to_trip_read(trip)


@router.post("/{trip_id}/gpx", response_model=TripRead)
async def upload_trip_gpx(
    trip_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: Annotated[UploadFile, File(...)],
    compress: Annotated[bool, Form()] = False,
) -> TripRead:
    trip = await _get_trip_or_404(session, trip_id)

    payload = await file.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded GPX file is empty"
        )

    trip.planned_path_polyline = build_trip_polyline_from_gpx(payload, compress=compress)
    await session.commit()
    trip = await _get_trip_or_404(session, trip_id)
    return _to_trip_read(trip)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    trip = await session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    await session.delete(trip)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _delete_trip_image_files(image: TripImage) -> None:
    delete_uploaded_image_files(
        storage_path=image.storage_path,
        thumbnail_storage_path=image.thumbnail_storage_path,
        tiny_thumbnail_storage_path=image.tiny_thumbnail_storage_path,
    )


def _delete_trip_map_card_files(trip: Trip) -> None:
    if not trip.map_card_storage_path:
        return

    delete_uploaded_image_files(
        storage_path=trip.map_card_storage_path,
        thumbnail_storage_path="",
    )


@router.post(
    "/{trip_id}/images", response_model=list[TripImageRead], status_code=status.HTTP_201_CREATED
)
async def upload_trip_images(
    trip_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    files: Annotated[list[UploadFile], File(...)],
    resize_mode: Annotated[str, Form()] = "keep",
    resize_width: Annotated[int | None, Form()] = None,
    resize_height: Annotated[int | None, Form()] = None,
) -> list[TripImageRead]:
    await _get_trip_or_404(session, trip_id)

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

    current_max_position = await session.scalar(
        select(func.max(TripImage.position)).where(TripImage.trip_id == trip_id)
    )
    next_position = (current_max_position or 0) + 1 if current_max_position is not None else 0

    created_images: list[TripImage] = []
    try:
        for file in files:
            uploaded = await create_uploaded_image(
                upload=file,
                resize_mode=resize_mode,
                resize_width=resize_width,
                resize_height=resize_height,
                storage_prefix=f"trips/{trip_id}",
            )
            image = TripImage(
                trip_id=trip_id,
                position=next_position,
                **_non_activity_image_payload(uploaded),
            )
            next_position += 1
            session.add(image)
            created_images.append(image)

        await session.commit()
    except Exception:
        await session.rollback()
        for image in created_images:
            _delete_trip_image_files(image)
        raise

    for image in created_images:
        await session.refresh(image)

    return [TripImageRead.model_validate(image) for image in created_images]


@router.post(
    "/{trip_id}/map-card-image", response_model=TripRead, status_code=status.HTTP_201_CREATED
)
async def upload_trip_map_card_image(
    trip_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: Annotated[UploadFile, File(...)],
    resize_mode: Annotated[str, Form()] = "keep",
    resize_width: Annotated[int | None, Form()] = None,
    resize_height: Annotated[int | None, Form()] = None,
) -> TripRead:
    trip = await _get_trip_or_404(session, trip_id)

    if resize_mode not in {"keep", "resize"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resize mode")

    if resize_mode == "resize" and (
        resize_width is None or resize_height is None or resize_width <= 0 or resize_height <= 0
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resize width and height must be positive integers",
        )

    previous_storage_path = trip.map_card_storage_path
    uploaded = await create_uploaded_image(
        upload=file,
        resize_mode=resize_mode,
        resize_width=resize_width,
        resize_height=resize_height,
        storage_prefix=f"trips/{trip_id}/map-card",
        create_thumbnails=False,
    )

    try:
        trip.map_card_storage_path = uploaded.storage_path
        trip.map_card_image_url = uploaded.image_url
        trip.map_card_width = uploaded.width
        trip.map_card_height = uploaded.height
        trip.map_card_content_type = uploaded.content_type
        await session.commit()
    except Exception:
        await session.rollback()
        delete_uploaded_image_files(
            storage_path=uploaded.storage_path,
            thumbnail_storage_path="",
        )
        raise

    if previous_storage_path:
        delete_uploaded_image_files(
            storage_path=previous_storage_path,
            thumbnail_storage_path="",
        )

    trip = await _get_trip_or_404(session, trip_id)
    return _to_trip_read(trip)


@router.delete("/{trip_id}/map-card-image", response_model=TripRead)
async def delete_trip_map_card_image(
    trip_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    trip = await _get_trip_or_404(session, trip_id)
    _delete_trip_map_card_files(trip)
    trip.map_card_storage_path = None
    trip.map_card_image_url = None
    trip.map_card_width = None
    trip.map_card_height = None
    trip.map_card_content_type = None
    await session.commit()
    trip = await _get_trip_or_404(session, trip_id)
    return _to_trip_read(trip)


@router.patch("/{trip_id}/map-card-image/rotate", response_model=TripRead)
async def rotate_trip_map_card_image(
    trip_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripRead:
    trip = await _get_trip_or_404(session, trip_id)
    if not trip.map_card_storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Trip map card image not found"
        )

    rotated = rotate_uploaded_image(
        storage_path=trip.map_card_storage_path,
        thumbnail_storage_path=None,
        tiny_thumbnail_storage_path=None,
        image_url=trip.map_card_image_url or "",
        thumbnail_url=None,
        tiny_thumbnail_url=None,
        content_type=trip.map_card_content_type or "image/jpeg",
        original_filename=None,
        gps_latitude=None,
        gps_longitude=None,
        capture_datetime_local=None,
        timezone=None,
        capture_datetime_utc=None,
        capture_timezone_source="unknown",
        capture_datetime_source="unknown",
        gps_datetime_utc=None,
        gps_timezone=None,
        create_thumbnails=False,
    )

    trip.map_card_storage_path = rotated.storage_path
    trip.map_card_image_url = rotated.image_url
    trip.map_card_width = rotated.width
    trip.map_card_height = rotated.height
    trip.map_card_content_type = rotated.content_type

    await session.commit()
    trip = await _get_trip_or_404(session, trip_id)
    return _to_trip_read(trip)


@router.delete("/{trip_id}/comments/{comment_id}", response_model=CommentRead)
async def delete_trip_comment(
    trip_id: int,
    comment_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CommentRead:
    comment = await session.get(TripComment, comment_id)
    if comment is None or comment.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip comment not found")

    payload = CommentRead.model_validate(comment)
    await session.delete(comment)
    await session.commit()
    return payload


@router.delete("/{trip_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip_image(
    trip_id: int,
    image_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    image = await session.get(TripImage, image_id)
    if image is None or image.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip image not found")

    _delete_trip_image_files(image)
    await session.delete(image)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{trip_id}/images/order", response_model=list[TripImageRead])
async def reorder_trip_images(
    trip_id: int,
    payload: TripImageOrderUpdate,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TripImageRead]:
    stmt = (
        select(TripImage)
        .where(TripImage.trip_id == trip_id)
        .order_by(TripImage.position.asc(), TripImage.created_at.asc(), TripImage.id.asc())
    )
    images = list((await session.scalars(stmt)).all())
    if not images:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip has no images")

    current_ids = [image.id for image in images]
    ordered_ids = payload.ordered_image_ids
    if len(ordered_ids) != len(current_ids) or set(ordered_ids) != set(current_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Image order does not match trip images"
        )

    images_by_id = {image.id: image for image in images}
    for index, image_id in enumerate(ordered_ids):
        images_by_id[image_id].position = index

    await session.commit()
    ordered_images = [images_by_id[image_id] for image_id in ordered_ids]
    return [TripImageRead.model_validate(image) for image in ordered_images]


@router.patch("/{trip_id}/images/{image_id}/rotate", response_model=TripImageRead)
async def rotate_trip_image(
    trip_id: int,
    image_id: int,
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripImageRead:
    image = await session.get(TripImage, image_id)
    if image is None or image.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip image not found")

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
        capture_datetime_local=None,
        timezone=None,
        capture_datetime_utc=None,
        capture_timezone_source="unknown",
        capture_datetime_source="unknown",
        gps_datetime_utc=None,
        gps_timezone=None,
    )

    for field, value in _non_activity_image_payload(rotated).items():
        setattr(image, field, value)

    await session.commit()
    await session.refresh(image)
    return TripImageRead.model_validate(image)
