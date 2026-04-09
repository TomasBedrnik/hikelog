from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.session import verify_admin_session_token
from app.core.config import settings
from app.db.session import get_session
from app.models.admin_user import AdminUser

bearer_scheme = HTTPBearer(auto_error=False)


def verify_google_token(token: str) -> tuple[str, str]:
    try:
        claims = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.google_oauth_client_id,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        ) from None

    email = claims.get("email")
    email_verified = claims.get("email_verified")
    sub = claims.get("sub")

    if not email or email_verified is not True or not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google identity not verified",
        )

    return email.strip().lower(), str(sub)


async def get_admin_by_identity(
    *,
    session: AsyncSession,
    email: str,
    sub: str,
    allow_sub_rebind: bool = False,
) -> AdminUser:
    email_norm = email.strip().lower()

    stmt = select(AdminUser).where(AdminUser.email == email_norm)
    admin = await session.scalar(stmt)

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an admin",
        )

    should_commit = False

    if admin.google_sub is None:
        admin.google_sub = str(sub)
        should_commit = True
    elif admin.google_sub != str(sub):
        if allow_sub_rebind:
            admin.google_sub = str(sub)
            should_commit = True
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin identity changed",
            )

    admin.last_login_at = datetime.now(timezone.utc)
    should_commit = True

    if should_commit:
        await session.commit()
        await session.refresh(admin)

    return admin


async def require_admin(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AdminUser:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    token = creds.credentials

    try:
        session_claims = verify_admin_session_token(token)
    except ValueError:
        email, sub = verify_google_token(token)
    else:
        email, sub = session_claims.email, session_claims.sub

    return await get_admin_by_identity(session=session, email=email, sub=sub)
