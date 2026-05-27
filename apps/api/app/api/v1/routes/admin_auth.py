from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.admin import admin_users_exist, get_admin_by_identity, verify_google_token
from app.auth.session import create_admin_session_token
from app.db.session import get_session
from app.schemas.admin_auth import AdminLoginRequest, AdminLoginResponse

router = APIRouter()


@router.post("/login", response_model=AdminLoginResponse)
async def login_admin(
    payload: AdminLoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AdminLoginResponse:
    email, sub = verify_google_token(payload.id_token)
    if not await admin_users_exist(session):
        return AdminLoginResponse(
            access_token=create_admin_session_token(email=email, sub=sub, bootstrap_only=True),
            bootstrap_only=True,
        )

    await get_admin_by_identity(
        session=session,
        email=email,
        sub=sub,
        allow_sub_rebind=True,
    )
    return AdminLoginResponse(
        access_token=create_admin_session_token(email=email, sub=sub),
        bootstrap_only=False,
    )
