"""add categories is_featured

Revision ID: f5a2e9c7b4d3
Revises: 7381b63ef5b8
Create Date: 2026-10-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f5a2e9c7b4d3'
down_revision = '7381b63ef5b8'
branch_labels = None
depends_on = None


def upgrade():
    # server_default ضروري: SQLite يرفض إضافة عمود NOT NULL بلا قيمة افتراضية.
    with op.batch_alter_table('categories', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_featured', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.create_index('ix_categories_active_featured', ['is_active', 'is_featured'], unique=False)


def downgrade():
    with op.batch_alter_table('categories', schema=None) as batch_op:
        batch_op.drop_index('ix_categories_active_featured')
        batch_op.drop_column('is_featured')