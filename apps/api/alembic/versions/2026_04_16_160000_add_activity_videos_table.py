"""add activity videos table

Revision ID: 2026_04_16_160000
Revises: 2026_04_16_150000
Create Date: 2026-04-16 16:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_04_16_160000"
down_revision: str | Sequence[str] | None = "2026_04_16_150000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "activity_videos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("activity_id", sa.BigInteger(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("original_storage_path", sa.String(), nullable=False),
        sa.Column("compressed_storage_path", sa.String(), nullable=True),
        sa.Column("thumbnail_storage_path", sa.String(), nullable=True),
        sa.Column("tiny_thumbnail_storage_path", sa.String(), nullable=True),
        sa.Column("original_video_url", sa.String(), nullable=False),
        sa.Column("compressed_video_url", sa.String(), nullable=True),
        sa.Column("thumbnail_url", sa.String(), nullable=True),
        sa.Column("tiny_thumbnail_url", sa.String(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("gps_latitude", sa.Float(), nullable=True),
        sa.Column("gps_longitude", sa.Float(), nullable=True),
        sa.Column("capture_datetime", sa.DateTime(timezone=False), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_videos")),
    )
    op.create_index(
        op.f("ix_activity_videos_activity_id"), "activity_videos", ["activity_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_activity_videos_activity_id"), table_name="activity_videos")
    op.drop_table("activity_videos")
