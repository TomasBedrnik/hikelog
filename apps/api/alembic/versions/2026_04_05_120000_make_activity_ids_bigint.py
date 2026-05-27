"""make activity ids bigint

Revision ID: 2026_04_05_120000
Revises: 2026_04_03_120000
Create Date: 2026-04-05 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_04_05_120000"
down_revision: Union[str, Sequence[str], None] = "2026_04_03_120000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "activities",
        "id",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        postgresql_using="id::bigint",
    )
    op.execute("ALTER SEQUENCE activities_id_seq AS bigint")
    op.alter_column(
        "activity_photos",
        "activity_id",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        postgresql_using="activity_id::bigint",
    )
    op.alter_column(
        "activity_comments",
        "activity_id",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        postgresql_using="activity_id::bigint",
    )


def downgrade() -> None:
    op.alter_column(
        "activity_comments",
        "activity_id",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        postgresql_using="activity_id::integer",
    )
    op.alter_column(
        "activity_photos",
        "activity_id",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        postgresql_using="activity_id::integer",
    )
    op.alter_column(
        "activities",
        "id",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        postgresql_using="id::integer",
    )
    op.execute("ALTER SEQUENCE activities_id_seq AS integer")
