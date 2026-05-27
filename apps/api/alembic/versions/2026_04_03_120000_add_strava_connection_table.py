"""add strava connection table

Revision ID: 2026_04_03_120000
Revises: 2026_03_30_200000
Create Date: 2026-04-03 12:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "2026_04_03_120000"
down_revision = "2026_03_30_200000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "strava_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("athlete_id", sa.BigInteger(), nullable=True),
        sa.Column("username", sa.String(length=120), nullable=True),
        sa.Column("firstname", sa.String(length=120), nullable=True),
        sa.Column("lastname", sa.String(length=120), nullable=True),
        sa.Column("profile_medium", sa.String(), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("scopes", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("oauth_state", sa.String(length=128), nullable=True),
        sa.Column("oauth_state_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_strava_connections")),
        sa.UniqueConstraint("athlete_id", name=op.f("uq_strava_connections_athlete_id")),
        sa.UniqueConstraint("oauth_state", name=op.f("uq_strava_connections_oauth_state")),
    )


def downgrade() -> None:
    op.drop_table("strava_connections")
