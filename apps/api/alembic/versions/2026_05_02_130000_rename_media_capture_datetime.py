"""rename media capture datetime columns

Revision ID: 2026_05_02_130000
Revises: 2026_05_02_120000
Create Date: 2026-05-02 13:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_05_02_130000"
down_revision: str | Sequence[str] | None = "2026_05_02_120000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "activity_photos",
        "capture_datetime",
        new_column_name="capture_datetime_local",
        existing_type=sa.DateTime(timezone=False),
        existing_nullable=True,
    )
    op.add_column("activity_photos", sa.Column("timezone", sa.String(length=64), nullable=True))

    op.alter_column(
        "activity_videos",
        "capture_datetime",
        new_column_name="capture_datetime_local",
        existing_type=sa.DateTime(timezone=False),
        existing_nullable=True,
    )
    op.add_column("activity_videos", sa.Column("timezone", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("activity_videos", "timezone")
    op.alter_column(
        "activity_videos",
        "capture_datetime_local",
        new_column_name="capture_datetime",
        existing_type=sa.DateTime(timezone=False),
        existing_nullable=True,
    )

    op.drop_column("activity_photos", "timezone")
    op.alter_column(
        "activity_photos",
        "capture_datetime_local",
        new_column_name="capture_datetime",
        existing_type=sa.DateTime(timezone=False),
        existing_nullable=True,
    )
