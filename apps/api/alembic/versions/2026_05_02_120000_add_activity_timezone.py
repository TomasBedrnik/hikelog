"""add activity timezone

Revision ID: 2026_05_02_120000
Revises: b9b7d39ac001
Create Date: 2026-05-02 12:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_05_02_120000"
down_revision: str | Sequence[str] | None = "b9b7d39ac001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("activities", sa.Column("timezone", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("activities", "timezone")
