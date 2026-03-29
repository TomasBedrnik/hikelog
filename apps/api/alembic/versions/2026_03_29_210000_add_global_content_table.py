"""add global content table

Revision ID: 2026_03_29_210000
Revises: 1d4f5c6f9e02
Create Date: 2026-03-29 21:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2026_03_29_210000'
down_revision = '1d4f5c6f9e02'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'global_contents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('main_headline', sa.String(length=300), nullable=True),
        sa.Column('home_content', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('hero_storage_path', sa.String(), nullable=True),
        sa.Column('hero_thumbnail_storage_path', sa.String(), nullable=True),
        sa.Column('hero_tiny_thumbnail_storage_path', sa.String(), nullable=True),
        sa.Column('hero_image_url', sa.String(), nullable=True),
        sa.Column('hero_thumbnail_url', sa.String(), nullable=True),
        sa.Column('hero_tiny_thumbnail_url', sa.String(), nullable=True),
        sa.Column('hero_width', sa.Integer(), nullable=True),
        sa.Column('hero_height', sa.Integer(), nullable=True),
        sa.Column('hero_thumbnail_width', sa.Integer(), nullable=True),
        sa.Column('hero_thumbnail_height', sa.Integer(), nullable=True),
        sa.Column('hero_tiny_thumbnail_width', sa.Integer(), nullable=True),
        sa.Column('hero_tiny_thumbnail_height', sa.Integer(), nullable=True),
        sa.Column('hero_content_type', sa.String(length=32), nullable=True),
        sa.Column('hero_original_filename', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_global_contents')),
    )


def downgrade() -> None:
    op.drop_table('global_contents')
