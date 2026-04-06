from __future__ import annotations

from typing import Any

import requests

from app.core.config import settings

WEBPUSHR_API_URL = "https://api.webpushr.com/v1"


class WebpushrServiceError(RuntimeError):
    def __init__(self, detail: str, status_code: int = 502) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def require_webpushr_settings() -> None:
    if settings.webpushr_enabled():
        return
    raise WebpushrServiceError("Webpushr is not configured", status_code=503)


def authenticate() -> dict[str, Any]:
    require_webpushr_settings()
    return _request_json("POST", "/authentication")


def get_subscriber_count() -> dict[str, Any]:
    require_webpushr_settings()
    return _request_json("GET", "/site/subscriber_count")


def send_notification(payload: dict[str, Any]) -> dict[str, Any]:
    require_webpushr_settings()
    return _request_json("POST", "/notification/send/all", json=payload)


def get_campaign_status(campaign_id: str) -> dict[str, Any]:
    require_webpushr_settings()
    return _request_json("GET", f"/notification/status/id/{campaign_id}")


def _request_json(method: str, path: str, json: dict[str, Any] | None = None) -> dict[str, Any]:
    headers = {
        "webpushrKey": settings.webpushr_api_key or "",
        "webpushrAuthToken": settings.webpushr_auth_token or "",
        "Content-Type": "application/json",
    }
    try:
        response = requests.request(
            method,
            f"{WEBPUSHR_API_URL}{path}",
            headers=headers,
            json=json,
            timeout=30,
        )
    except requests.RequestException as exc:
        raise WebpushrServiceError("Unable to reach Webpushr API", status_code=502) from exc

    try:
        payload = response.json()
    except ValueError:
        payload = None

    if not response.ok:
        raise WebpushrServiceError(_extract_error_detail(response, payload), status_code=502)

    if not isinstance(payload, dict):
        raise WebpushrServiceError("Invalid Webpushr response", status_code=502)

    if str(payload.get("status") or "").lower() == "failure":
        raise WebpushrServiceError(
            _extract_error_detail(response, payload),
            status_code=502,
        )

    return payload


def _extract_error_detail(response: requests.Response, payload: Any) -> str:
    if isinstance(payload, dict):
        description = payload.get("description")
        if isinstance(description, str) and description.strip():
            return description
        error_type = payload.get("type")
        if isinstance(error_type, str) and error_type.strip():
            return error_type

    text = response.text.strip()
    return text or f"Webpushr request failed with status {response.status_code}"
