"""add Sariee shipment weight

Revision ID: b3e7a1c9d5f2
Revises: a6d4f2c8b1e7
Create Date: 2026-10-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "b3e7a1c9d5f2"
down_revision = "a6d4f2c8b1e7"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "shipping_provider_settings",
        sa.Column(
            "default_weight_kg",
            sa.Numeric(precision=8, scale=3),
            nullable=False,
            server_default="1",
        ),
    )


def downgrade():
    op.drop_column("shipping_provider_settings", "default_weight_kg")
