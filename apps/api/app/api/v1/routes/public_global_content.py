from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.global_content import GlobalContent
from app.schemas.global_content import GlobalContentRead

router = APIRouter()


@router.get("", response_model=GlobalContentRead)
async def get_public_global_content(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GlobalContentRead:
    stmt = select(GlobalContent).order_by(GlobalContent.id.asc())
    global_content = (await session.scalars(stmt)).first()
    if global_content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Global content not found"
        )
    return GlobalContentRead.model_validate(global_content)
