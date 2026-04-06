from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth.admin import require_admin
from app.models.admin_user import AdminUser
from app.schemas.webpushr import (
    WebpushrCampaignStatusRead,
    WebpushrSendRead,
    WebpushrSendWrite,
    WebpushrSummaryRead,
)
from app.services.webpushr import (
    WebpushrServiceError,
    authenticate,
    get_campaign_status,
    get_subscriber_count,
    require_webpushr_settings,
    send_notification,
)

router = APIRouter()


def _to_int_or_none(value: Any) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return None


def _to_str_or_none(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


@router.get("/summary", response_model=WebpushrSummaryRead)
async def get_webpushr_summary(
    _: Annotated[AdminUser, Depends(require_admin)],
) -> WebpushrSummaryRead:
    if not require_webpushr_settings_wrapper():
        return WebpushrSummaryRead(configured=False, authorized=False)

    try:
        auth_payload = authenticate()
        count_payload = get_subscriber_count()
    except WebpushrServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return WebpushrSummaryRead(
        configured=True,
        authorized=str(auth_payload.get("status") or "").lower() == "success",
        authorization_description=_to_str_or_none(auth_payload.get("description")),
        total_subscribers=(
            _to_int_or_none(count_payload.get("total_life_time_subscribers"))
            or
            _to_int_or_none(count_payload.get("total_subscribers"))
            or _to_int_or_none(count_payload.get("subscribers_count"))
            or _to_int_or_none(count_payload.get("subscribers"))
        ),
        active_subscribers=(
            _to_int_or_none(count_payload.get("active_subscribers"))
            or _to_int_or_none(count_payload.get("active"))
        ),
    )


@router.post("/send", response_model=WebpushrSendRead)
async def create_webpushr_notification(
    payload: WebpushrSendWrite,
    _: Annotated[AdminUser, Depends(require_admin)],
) -> WebpushrSendRead:
    try:
        require_webpushr_settings()
        response_payload = send_notification(
            {
                "title": payload.title,
                "message": payload.message,
                "target_url": payload.target_url,
                **({"icon": payload.icon} if payload.icon else {}),
                **({"image": payload.image} if payload.image else {}),
            }
        )
    except WebpushrServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    campaign_id = (
        _to_str_or_none(response_payload.get("id"))
        or _to_str_or_none(response_payload.get("campaign_id"))
        or _to_str_or_none(response_payload.get("notification_id"))
    )
    return WebpushrSendRead(
        status=_to_str_or_none(response_payload.get("status")) or "success",
        description=_to_str_or_none(response_payload.get("description")),
        campaign_id=campaign_id,
    )


@router.get("/campaigns/{campaign_id}", response_model=WebpushrCampaignStatusRead)
async def get_webpushr_campaign(
    campaign_id: str,
    _: Annotated[AdminUser, Depends(require_admin)],
) -> WebpushrCampaignStatusRead:
    try:
        require_webpushr_settings()
        payload = get_campaign_status(campaign_id)
    except WebpushrServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    raw_status = payload.get("status") if isinstance(payload.get("status"), dict) else payload
    if not isinstance(raw_status, dict):
        raw_status = {}

    return WebpushrCampaignStatusRead(
        campaign_id=campaign_id,
        status=(
            _to_str_or_none(raw_status.get("campaign_status"))
            or _to_str_or_none(raw_status.get("status"))
            or "unknown"
        ),
        title=_to_str_or_none(raw_status.get("title")),
        message=_to_str_or_none(raw_status.get("message")),
        target_url=_to_str_or_none(raw_status.get("target_url")),
        sent_count=(
            _to_int_or_none(raw_status.get("sent"))
            or _to_int_or_none(raw_status.get("sent_count"))
            or _to_int_or_none(raw_status.get("successfully_sent"))
        ),
        delivered_count=(
            _to_int_or_none(raw_status.get("delivered"))
            or _to_int_or_none(raw_status.get("delivered_count"))
        ),
        clicked_count=(
            _to_int_or_none(raw_status.get("clicked"))
            or _to_int_or_none(raw_status.get("clicked_count"))
        ),
        closed_count=(
            _to_int_or_none(raw_status.get("closed"))
            or _to_int_or_none(raw_status.get("closed_count"))
        ),
        failed_count=(
            _to_int_or_none(raw_status.get("failed"))
            or _to_int_or_none(raw_status.get("failed_count"))
            or _to_int_or_none(raw_status.get("failed_to_send"))
        ),
        raw_status={key: _to_raw_status_value(value) for key, value in raw_status.items()},
    )


def require_webpushr_settings_wrapper() -> bool:
    try:
        require_webpushr_settings()
    except WebpushrServiceError:
        return False
    return True


def _to_raw_status_value(value: Any) -> str | int | float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int | float | str):
        return value
    return str(value)
