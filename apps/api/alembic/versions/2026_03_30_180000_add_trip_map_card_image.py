"""add trip map card image

Revision ID: 2026_03_30_180000
Revises: 2026_03_29_220000
Create Date: 2026-03-30 18:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2026_03_30_180000'
down_revision = '2026_03_29_220000'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('trips', sa.Column('map_card_storage_path', sa.String(), nullable=True))
    op.add_column('trips', sa.Column('map_card_image_url', sa.String(), nullable=True))
    op.add_column('trips', sa.Column('map_card_width', sa.Integer(), nullable=True))
    op.add_column('trips', sa.Column('map_card_height', sa.Integer(), nullable=True))
    op.add_column('trips', sa.Column('map_card_content_type', sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column('trips', 'map_card_content_type')
    op.drop_column('trips', 'map_card_height')
    op.drop_column('trips', 'map_card_width')
    op.drop_column('trips', 'map_card_image_url')
    op.drop_column('trips', 'map_card_storage_path')
