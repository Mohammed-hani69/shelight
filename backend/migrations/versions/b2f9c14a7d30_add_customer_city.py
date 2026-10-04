"""add customer city

Revision ID: b2f9c14a7d30
Revises: 7c3757b9e336
Create Date: 2026-10-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2f9c14a7d30'
down_revision = '7c3757b9e336'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('city', sa.String(length=120), nullable=True))


def downgrade():
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.drop_column('city')
