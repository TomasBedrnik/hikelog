"""add activities table

Revision ID: c35a1d32e4b6
Revises: 7d01953cae89
Create Date: 2026-03-28 19:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c35a1d32e4b6"
down_revision: Union[str, Sequence[str], None] = "7d01953cae89"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("strava_activity_id", sa.BigInteger(), nullable=True),
        sa.Column("user_id", sa.BigInteger(), nullable=True),
        sa.Column("upload_id", sa.BigInteger(), nullable=True),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("type", sa.String(length=32), nullable=True),
        sa.Column("sport_type", sa.String(length=32), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("distance", sa.Float(), nullable=True),
        sa.Column("moving_time", sa.Integer(), nullable=True),
        sa.Column("elapsed_time", sa.Integer(), nullable=True),
        sa.Column("total_elevation_gain", sa.Float(), nullable=True),
        sa.Column("description", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("polyline", sa.String(), nullable=True),
        sa.Column("summary_polyline", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("strava_activity_id"),
    )
    op.create_index(op.f("ix_activities_trip_id"), "activities", ["trip_id"], unique=False)
    op.create_index(op.f("ix_activities_user_id"), "activities", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_activities_user_id"), table_name="activities")
    op.drop_index(op.f("ix_activities_trip_id"), table_name="activities")
    op.drop_table("activities")
