from __future__ import annotations

import base64
import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.core.config import settings


@dataclass(slots=True)
class AdminSessionClaims:
    email: str
    sub: str
    exp: int
    bootstrap_only: bool


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sign(payload_b64: str) -> str:
    digest = hmac.new(
        settings.admin_session_secret_value().encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(digest)


def create_admin_session_token(*, email: str, sub: str, bootstrap_only: bool = False) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.admin_session_days)
    payload = {
        "email": email,
        "sub": sub,
        "exp": int(expires_at.timestamp()),
        "bootstrap_only": bootstrap_only,
    }
    payload_b64 = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signature = _sign(payload_b64)
    return f"{payload_b64}.{signature}"


def verify_admin_session_token(token: str) -> AdminSessionClaims:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError as exc:
        raise ValueError("Invalid session token format") from exc

    expected_signature = _sign(payload_b64)
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("Invalid session token signature")

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except Exception as exc:
        raise ValueError("Invalid session token payload") from exc

    email = payload.get("email")
    sub = payload.get("sub")
    exp = payload.get("exp")
    bootstrap_only = payload.get("bootstrap_only", False)

    if not isinstance(email, str) or not email.strip():
        raise ValueError("Invalid session token email")
    if not isinstance(sub, str) or not sub.strip():
        raise ValueError("Invalid session token subject")
    if not isinstance(exp, int):
        raise ValueError("Invalid session token expiration")
    if not isinstance(bootstrap_only, bool):
        raise ValueError("Invalid session token bootstrap flag")
    if exp <= int(datetime.now(timezone.utc).timestamp()):
        raise ValueError("Session token expired")

    return AdminSessionClaims(
        email=email.strip().lower(),
        sub=sub,
        exp=exp,
        bootstrap_only=bootstrap_only,
    )
