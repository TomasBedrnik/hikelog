"""add media capture metadata columns

Revision ID: 2026_05_02_140000
Revises: 2026_05_02_130000
Create Date: 2026-05-02 14:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_05_02_140000"
down_revision: str | Sequence[str] | None = "2026_05_02_130000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = ("activity_photos", "activity_videos")


def upgrade() -> None:
    for table_name in TABLES:
        op.add_column(
            table_name,
            sa.Column("capture_datetime_utc", sa.DateTime(timezone=True), nullable=True),
        )
        op.add_column(
            table_name,
            sa.Column("capture_timezone_source", sa.String(length=32), nullable=True),
        )
        op.add_column(
            table_name,
            sa.Column("capture_datetime_source", sa.String(length=32), nullable=True),
        )
        op.add_column(
            table_name,
            sa.Column("gps_datetime_utc", sa.DateTime(timezone=True), nullable=True),
        )
        op.add_column(table_name, sa.Column("gps_timezone", sa.String(length=64), nullable=True))


def downgrade() -> None:
    for table_name in reversed(TABLES):
        op.drop_column(table_name, "gps_timezone")
        op.drop_column(table_name, "gps_datetime_utc")
        op.drop_column(table_name, "capture_datetime_source")
        op.drop_column(table_name, "capture_timezone_source")
        op.drop_column(table_name, "capture_datetime_utc")
