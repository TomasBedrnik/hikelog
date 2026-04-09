"""add activity audios

Revision ID: b5c7f5e8c2d1
Revises: 2026_04_08_120000_add_activity_photo_resize_setting
Create Date: 2026-04-09 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b5c7f5e8c2d1"
down_revision: str | Sequence[str] | None = "2026_04_08_120000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "activity_audios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("activity_id", sa.BigInteger(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("audio_url", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("transcription_raw", sa.Text(), nullable=True),
        sa.Column("transcription_enhanced", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_activity_audios_activity_id"), "activity_audios", ["activity_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_activity_audios_activity_id"), table_name="activity_audios")
    op.drop_table("activity_audios")
