"""add trip and activity comments

Revision ID: 2026_03_30_200000
Revises: 2026_03_30_180000
Create Date: 2026-03-30 20:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "2026_03_30_200000"
down_revision = "2026_03_30_180000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trip_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trip_comments_trip_id"), "trip_comments", ["trip_id"], unique=False)

    op.create_table(
        "activity_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_activity_comments_activity_id"), "activity_comments", ["activity_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_activity_comments_activity_id"), table_name="activity_comments")
    op.drop_table("activity_comments")
    op.drop_index(op.f("ix_trip_comments_trip_id"), table_name="trip_comments")
    op.drop_table("trip_comments")
