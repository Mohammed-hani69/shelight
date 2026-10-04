"""add optional mobile banner image

Revision ID: e1c9a7b5d3f2
Revises: b7d2e5f8a1c3
Create Date: 2026-10-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "e1c9a7b5d3f2"
down_revision = "b7d2e5f8a1c3"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("banners", schema=None) as batch_op:
        batch_op.add_column(sa.Column("mobile_image_url", sa.String(length=500), nullable=True))


def downgrade():
    with op.batch_alter_table("banners", schema=None) as batch_op:
        batch_op.drop_column("mobile_image_url")