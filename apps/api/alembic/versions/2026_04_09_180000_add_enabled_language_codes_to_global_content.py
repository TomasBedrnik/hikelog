"""add enabled language codes to global content

Revision ID: 2026_04_09_180000
Revises: 2026_04_09_150000
Create Date: 2026-04-09 18:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "2026_04_09_180000"
down_revision: str | Sequence[str] | None = "2026_04_09_150000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "global_contents",
        sa.Column(
            "enabled_language_codes",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[\"en\", \"cs\"]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("global_contents", "enabled_language_codes")
