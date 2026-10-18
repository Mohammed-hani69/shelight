"""add accounting cost snapshots

Revision ID: e2b7c4d9a613
Revises: d4a8c2f9b671
Create Date: 2026-10-18 15:54:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "e2b7c4d9a613"
down_revision = "d4a8c2f9b671"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.add_column(sa.Column("cost_price", sa.Numeric(10, 2), nullable=True))

    with op.batch_alter_table("order_items", schema=None) as batch_op:
        batch_op.add_column(sa.Column("unit_cost", sa.Numeric(10, 2), nullable=True))


def downgrade():
    with op.batch_alter_table("order_items", schema=None) as batch_op:
        batch_op.drop_column("unit_cost")

    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.drop_column("cost_price")
