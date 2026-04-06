from __future__ import annotations

from pydantic import BaseModel, Field


class WebpushrSummaryRead(BaseModel):
    configured: bool
    authorized: bool
    authorization_description: str | None = None
    total_subscribers: int | None = None
    active_subscribers: int | None = None


class WebpushrSendWrite(BaseModel):
    title: str
    message: str
    target_url: str
    icon: str | None = None
    image: str | None = None


class WebpushrSendRead(BaseModel):
    status: str
    description: str | None = None
    campaign_id: str | None = None


class WebpushrCampaignStatusRead(BaseModel):
    campaign_id: str
    status: str
    title: str | None = None
    message: str | None = None
    target_url: str | None = None
    sent_count: int | None = None
    delivered_count: int | None = None
    clicked_count: int | None = None
    closed_count: int | None = None
    failed_count: int | None = None
    raw_status: dict[str, str | int | float | None] = Field(default_factory=dict)
