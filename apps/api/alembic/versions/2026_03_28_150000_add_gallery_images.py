"""add gallery_images table

Revision ID: 8922c4dd6d56
Revises: fb907b7db820
Create Date: 2026-03-28 15:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8922c4dd6d56"
down_revision: Union[str, Sequence[str], None] = "fb907b7db820"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "gallery_images",
        sa.Column("id", sa.Integer(), nullable=False),
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
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("gallery_images")
