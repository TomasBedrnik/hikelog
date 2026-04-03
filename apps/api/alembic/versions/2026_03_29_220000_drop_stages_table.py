"""drop stages table

Revision ID: 2026_03_29_220000
Revises: 2026_03_29_210000
Create Date: 2026-03-29 22:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "2026_03_29_220000"
down_revision = "2026_03_29_210000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index(op.f("ix_stages_trip_id"), table_name="stages")
    op.drop_table("stages")


def downgrade() -> None:
    op.create_table(
        "stages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=True),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("activity_type", sa.String(length=32), nullable=True),
        sa.Column("path_polyline", sa.String(), nullable=False),
        sa.Column("start_date_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=True),
        sa.Column("distance_m", sa.Integer(), nullable=True),
        sa.Column("moving_time_s", sa.Integer(), nullable=True),
        sa.Column("elapsed_time_s", sa.Integer(), nullable=True),
        sa.Column("elevation_gain_m", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=True),
        sa.Column("source_id", sa.String(length=128), nullable=True),
        sa.Column("source_user_id", sa.String(length=128), nullable=True),
        sa.Column(
            "metrics",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["trip_id"], ["trips.id"], name=op.f("fk_stages_trip_id_trips"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stages")),
    )
    op.create_index(op.f("ix_stages_trip_id"), "stages", ["trip_id"], unique=False)
