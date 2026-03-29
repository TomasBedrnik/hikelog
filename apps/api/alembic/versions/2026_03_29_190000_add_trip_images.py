"""add trip images

Revision ID: 1d4f5c6f9e02
Revises: 7f2d9a91f2cb
Create Date: 2026-03-29 19:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "1d4f5c6f9e02"
down_revision: str | Sequence[str] | None = "7f2d9a91f2cb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "trip_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("thumbnail_storage_path", sa.String(), nullable=False),
        sa.Column("tiny_thumbnail_storage_path", sa.String(), nullable=True),
        sa.Column("image_url", sa.String(), nullable=False),
        sa.Column("thumbnail_url", sa.String(), nullable=False),
        sa.Column("tiny_thumbnail_url", sa.String(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("thumbnail_width", sa.Integer(), nullable=False),
        sa.Column("thumbnail_height", sa.Integer(), nullable=False),
        sa.Column("tiny_thumbnail_width", sa.Integer(), nullable=True),
        sa.Column("tiny_thumbnail_height", sa.Integer(), nullable=True),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("gps_latitude", sa.Float(), nullable=True),
        sa.Column("gps_longitude", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trip_images_trip_id"), "trip_images", ["trip_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_trip_images_trip_id"), table_name="trip_images")
    op.drop_table("trip_images")
