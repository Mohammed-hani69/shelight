"""phone-based customer accounts and saved address

Revision ID: f1c7a9d2e4b6
Revises: 7381b63ef5b8
Create Date: 2026-10-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "f1c7a9d2e4b6"
down_revision = ("7381b63ef5b8", "d1e4b5c6a7f8")
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("customers", schema=None) as batch_op:
        batch_op.alter_column(
            "email",
            existing_type=sa.String(length=254),
            nullable=True,
        )
        batch_op.add_column(sa.Column("address", sa.String(length=300), nullable=True))
        batch_op.add_column(sa.Column("governorate", sa.String(length=120), nullable=True))


def downgrade():
    with op.batch_alter_table("customers", schema=None) as batch_op:
        batch_op.drop_column("address")
        batch_op.drop_column("governorate")
        batch_op.alter_column(
            "email",
            existing_type=sa.String(length=254),
            nullable=False,
        )