"""add activity_photos table

Revision ID: 2026_03_28_210000
Revises: c35a1d32e4b6
Create Date: 2026-03-28 21:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_03_28_210000"
down_revision: Union[str, Sequence[str], None] = "c35a1d32e4b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activity_photos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("thumbnail_storage_path", sa.String(), nullable=False),
        sa.Column("image_url", sa.String(), nullable=False),
        sa.Column("thumbnail_url", sa.String(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("thumbnail_width", sa.Integer(), nullable=False),
        sa.Column("thumbnail_height", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_activity_photos_activity_id"), "activity_photos", ["activity_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_activity_photos_activity_id"), table_name="activity_photos")
    op.drop_table("activity_photos")
