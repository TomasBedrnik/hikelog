"""add capture datetime to activity photos

Revision ID: 2026_04_16_150000
Revises: 2026_04_16_120000
Create Date: 2026-04-16 15:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_04_16_150000"
down_revision: str | Sequence[str] | None = "2026_04_16_120000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "activity_photos",
        sa.Column("capture_datetime", sa.DateTime(timezone=False), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("activity_photos", "capture_datetime")
