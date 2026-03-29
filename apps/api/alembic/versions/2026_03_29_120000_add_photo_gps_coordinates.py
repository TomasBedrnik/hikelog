"""add gps coordinates to uploaded photos

Revision ID: 5f8b6d5f2ad1
Revises: 2026_03_28_210000
Create Date: 2026-03-29 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5f8b6d5f2ad1"
down_revision: str | Sequence[str] | None = "2026_03_28_210000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("activity_photos", sa.Column("gps_latitude", sa.Float(), nullable=True))
    op.add_column("activity_photos", sa.Column("gps_longitude", sa.Float(), nullable=True))
    op.add_column("gallery_images", sa.Column("gps_latitude", sa.Float(), nullable=True))
    op.add_column("gallery_images", sa.Column("gps_longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("gallery_images", "gps_longitude")
    op.drop_column("gallery_images", "gps_latitude")
    op.drop_column("activity_photos", "gps_longitude")
    op.drop_column("activity_photos", "gps_latitude")
