"""add bundles and bundle_items

Revision ID: c3a1b2d4e5f6
Revises: b2f9c14a7d30
Create Date: 2026-10-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3a1b2d4e5f6'
down_revision = 'b2f9c14a7d30'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'bundles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=160), nullable=False),
        sa.Column('name_en', sa.String(length=200), nullable=False),
        sa.Column('name_ar', sa.String(length=200), nullable=False),
        sa.Column('description_en', sa.Text(), nullable=False),
        sa.Column('description_ar', sa.Text(), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('badge_en', sa.String(length=80), nullable=True),
        sa.Column('badge_ar', sa.String(length=80), nullable=True),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('compare_at_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('coupon_code', sa.String(length=50), nullable=True),
        sa.Column('rating', sa.Float(), nullable=False),
        sa.Column('review_count', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_bundles_slug'), 'bundles', ['slug'], unique=True)

    op.create_table(
        'bundle_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bundle_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['bundle_id'], ['bundles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_bundle_items_bundle_id'), 'bundle_items', ['bundle_id'])
    op.create_index(op.f('ix_bundle_items_product_id'), 'bundle_items', ['product_id'])


def downgrade():
    op.drop_index(op.f('ix_bundle_items_product_id'), table_name='bundle_items')
    op.drop_index(op.f('ix_bundle_items_bundle_id'), table_name='bundle_items')
    op.drop_table('bundle_items')
    op.drop_index(op.f('ix_bundles_slug'), table_name='bundles')
    op.drop_table('bundles')
