from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.admin import BootstrapAdminIdentity, require_admin, require_admin_user_setup_access
from app.db.session import get_session
from app.models.admin_user import AdminUser
from app.schemas.admin_user import AdminUserCreate, AdminUserRead

router = APIRouter()


@router.get("", response_model=list[AdminUserRead])
async def list_admin_users(
    identity: Annotated[
        AdminUser | BootstrapAdminIdentity, Depends(require_admin_user_setup_access)
    ],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[AdminUserRead]:
    if isinstance(identity, BootstrapAdminIdentity):
        return []

    stmt = select(AdminUser).order_by(AdminUser.email.asc())
    admins = (await session.scalars(stmt)).all()
    return [AdminUserRead.model_validate(a) for a in admins]


@router.post("", response_model=AdminUserRead, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    payload: AdminUserCreate,
    identity: Annotated[
        AdminUser | BootstrapAdminIdentity, Depends(require_admin_user_setup_access)
    ],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AdminUserRead:
    email = payload.email.strip().lower()
    if isinstance(identity, BootstrapAdminIdentity):
        if email != identity.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bootstrap setup can only create the currently signed-in user",
            )
        admin = AdminUser(
            email=email,
            google_sub=identity.sub,
            last_login_at=datetime.now(timezone.utc),
        )
    else:
        admin = AdminUser(email=email)
    session.add(admin)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Admin user already exists"
        ) from None

    await session.refresh(admin)
    return AdminUserRead.model_validate(admin)


@router.delete("/{admin_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_user(
    admin_user_id: int,
    current_admin: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    admin = await session.get(AdminUser, admin_user_id)
    if admin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found")

    if admin.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin access",
        )

    await session.delete(admin)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
