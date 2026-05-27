"""add activity photo resize setting to global content

Revision ID: 2026_04_08_120000
Revises: 2026_04_05_120000
Create Date: 2026-04-08 12:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "2026_04_08_120000"
down_revision = "2026_04_05_120000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "global_contents",
        sa.Column(
            "activity_photo_resize_long_side",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1920"),
        ),
    )


def downgrade() -> None:
    op.drop_column("global_contents", "activity_photo_resize_long_side")
