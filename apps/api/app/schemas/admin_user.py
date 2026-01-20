from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminUserBase(BaseModel):
    email: EmailStr = Field(..., description="Admin allowlisted email (case-insensitive).")


class AdminUserCreate(AdminUserBase):
    # created manually / seed script / admin-only endpoint later
    pass


class AdminUserRead(AdminUserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    google_sub: str | None
    created_at: datetime
    last_login_at: datetime | None
