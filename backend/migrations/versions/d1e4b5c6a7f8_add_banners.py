"""add banners table

Revision ID: d1e4b5c6a7f8
Revises: c8d5e2f3a4b6
Create Date: 2026-10-03 20:30:00.000000

يضيف جدول البنرات القابلة للإدارة (الهيرو أعلى الرئيسية والإديتوريال وسطها):
صورة + رابط + ترتيب + إظهار/إخفاء، لكل قسم.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd1e4b5c6a7f8'
down_revision = 'c8d5e2f3a4b6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'banners',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('section', sa.String(length=20), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('link_url', sa.String(length=500), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_banners_section_order', 'banners', ['section', 'sort_order']
    )


def downgrade():
    op.drop_index('ix_banners_section_order', table_name='banners')
    op.drop_table('banners')
