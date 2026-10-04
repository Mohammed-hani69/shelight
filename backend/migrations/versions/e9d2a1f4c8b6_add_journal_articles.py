"""add journal_articles

Revision ID: e9d2a1f4c8b6
Revises: f5a2e9c7b4d3
Create Date: 2026-10-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e9d2a1f4c8b6'
down_revision = 'f5a2e9c7b4d3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'journal_articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=160), nullable=False),
        sa.Column('title_en', sa.String(length=200), nullable=False),
        sa.Column('title_ar', sa.String(length=200), nullable=False),
        sa.Column('excerpt_en', sa.Text(), nullable=False),
        sa.Column('excerpt_ar', sa.Text(), nullable=False),
        sa.Column('content_en', sa.JSON(), nullable=False),
        sa.Column('content_ar', sa.JSON(), nullable=False),
        sa.Column('category', sa.String(length=120), nullable=False),
        sa.Column('author', sa.String(length=120), nullable=False),
        sa.Column('read_time', sa.String(length=60), nullable=False),
        sa.Column('publish_date', sa.Date(), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('is_featured', sa.Boolean(), nullable=False),
        sa.Column('is_published', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_journal_articles_slug'), 'journal_articles', ['slug'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_journal_articles_slug'), table_name='journal_articles')
    op.drop_table('journal_articles')