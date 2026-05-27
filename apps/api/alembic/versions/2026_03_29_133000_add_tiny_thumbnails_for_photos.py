"""add tiny thumbnails for uploaded photos

Revision ID: 7f2d9a91f2cb
Revises: 5f8b6d5f2ad1
Create Date: 2026-03-29 13:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "7f2d9a91f2cb"
down_revision: str | Sequence[str] | None = "5f8b6d5f2ad1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table_name in ("activity_photos", "gallery_images"):
        op.add_column(
            table_name, sa.Column("tiny_thumbnail_storage_path", sa.String(), nullable=True)
        )
        op.add_column(table_name, sa.Column("tiny_thumbnail_url", sa.String(), nullable=True))
        op.add_column(table_name, sa.Column("tiny_thumbnail_width", sa.Integer(), nullable=True))
        op.add_column(table_name, sa.Column("tiny_thumbnail_height", sa.Integer(), nullable=True))


def downgrade() -> None:
    for table_name in ("gallery_images", "activity_photos"):
        op.drop_column(table_name, "tiny_thumbnail_height")
        op.drop_column(table_name, "tiny_thumbnail_width")
        op.drop_column(table_name, "tiny_thumbnail_url")
        op.drop_column(table_name, "tiny_thumbnail_storage_path")
