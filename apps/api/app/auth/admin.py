from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.models.admin_user import AdminUser

bearer_scheme = HTTPBearer(auto_error=False)


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

    email_norm = email.strip().lower()

    stmt = select(AdminUser).where(AdminUser.email == email_norm)
    admin = await session.scalar(stmt)

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an admin",
        )

    # Optional: bind google_sub on first successful login
    if admin.google_sub is None:
        admin.google_sub = str(sub)
        # you can also update last_login_at here if you want
        await session.commit()
        await session.refresh(admin)

    return admin
