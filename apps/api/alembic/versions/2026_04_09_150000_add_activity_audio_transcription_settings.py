"""add activity audio transcription settings

Revision ID: 2026_04_09_150000
Revises: b5c7f5e8c2d1
Create Date: 2026-04-09 15:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_04_09_150000"
down_revision: str | Sequence[str] | None = "b5c7f5e8c2d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "global_contents",
        sa.Column("activity_audio_transcription_language_code", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "global_contents",
        sa.Column(
            "activity_audio_transcription_model",
            sa.String(length=64),
            nullable=False,
            server_default="latest_long",
        ),
    )
    op.add_column(
        "global_contents",
        sa.Column(
            "activity_audio_transcription_enable_automatic_punctuation",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "global_contents",
        sa.Column(
            "activity_audio_transcription_profanity_filter",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("global_contents", "activity_audio_transcription_profanity_filter")
    op.drop_column(
        "global_contents", "activity_audio_transcription_enable_automatic_punctuation"
    )
    # op.drop_column("global_contents", "activity_audio_transcription_model")
    op.drop_column("global_contents", "activity_audio_transcription_language_code")
