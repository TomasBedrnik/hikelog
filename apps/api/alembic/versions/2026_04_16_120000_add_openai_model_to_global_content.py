"""add openai model to global content

Revision ID: 2026_04_16_120000
Revises: 2026_04_09_180000
Create Date: 2026-04-16 12:00:00.000000
"""

import os
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_04_16_120000"
down_revision: str | Sequence[str] | None = "2026_04_09_180000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    default_model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    op.add_column(
        "global_contents",
        sa.Column(
            "activity_audio_enhancement_openai_model",
            sa.String(length=64),
            nullable=False,
            server_default=default_model,
        ),
    )


def downgrade() -> None:
    op.drop_column("global_contents", "activity_audio_enhancement_openai_model")
