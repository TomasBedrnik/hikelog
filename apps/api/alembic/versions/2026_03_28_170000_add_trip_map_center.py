"""add trip map center fields

Revision ID: 7d01953cae89
Revises: 8922c4dd6d56
Create Date: 2026-03-28 17:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7d01953cae89"
down_revision: Union[str, Sequence[str], None] = "8922c4dd6d56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("trips", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("trips", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column("trips", sa.Column("zoom", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("trips", "zoom")
    op.drop_column("trips", "longitude")
    op.drop_column("trips", "latitude")
