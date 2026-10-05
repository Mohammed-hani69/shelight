"""add homepage display flag to reviews

Revision ID: a6d4f2c8b1e7
Revises: f2a8c6d4e1b9
Create Date: 2026-10-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "a6d4f2c8b1e7"
down_revision = "f2a8c6d4e1b9"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("reviews", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("show_on_home", sa.Boolean(), nullable=False, server_default=sa.false())
        )


def downgrade():
    with op.batch_alter_table("reviews", schema=None) as batch_op:
        batch_op.drop_column("show_on_home")