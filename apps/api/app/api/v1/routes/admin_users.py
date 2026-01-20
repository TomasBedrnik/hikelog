from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.admin import require_admin
from app.db.session import get_session
from app.models.admin_user import AdminUser
from app.schemas.admin_user import AdminUserRead

router = APIRouter()


@router.get("", response_model=list[AdminUserRead])
async def list_admin_users(
    _: Annotated[AdminUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[AdminUserRead]:
    stmt = select(AdminUser).order_by(AdminUser.email.asc())
    admins = (await session.scalars(stmt)).all()
    return [AdminUserRead.model_validate(a) for a in admins]
