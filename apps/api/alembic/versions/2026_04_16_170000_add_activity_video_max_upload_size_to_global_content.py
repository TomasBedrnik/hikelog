"""add activity video max upload size to global content

Revision ID: b9b7d39ac001
Revises: 2026_04_16_160000
Create Date: 2026-04-16 17:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "b9b7d39ac001"
down_revision = "2026_04_16_160000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "global_contents",
        sa.Column(
            "activity_video_max_upload_size_mb",
            sa.Integer(),
            nullable=False,
            server_default="512",
        ),
    )
    op.alter_column("global_contents", "activity_video_max_upload_size_mb", server_default=None)


def downgrade() -> None:
    op.drop_column("global_contents", "activity_video_max_upload_size_mb")
