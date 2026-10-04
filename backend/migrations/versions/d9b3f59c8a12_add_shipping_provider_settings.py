"""add shipping provider settings

Revision ID: d9b3f59c8a12
Revises: f5a2e9c7b4d3
Create Date: 2026-10-03 00:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "d9b3f59c8a12"
down_revision = "f5a2e9c7b4d3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "shipping_provider_settings",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("environment", sa.String(length=20), nullable=False, server_default="sandbox"),
        sa.Column("api_key_encrypted", sa.Text(), nullable=True),
        sa.Column("client_id_encrypted", sa.Text(), nullable=True),
        sa.Column("secret_encrypted", sa.Text(), nullable=True),
        sa.Column("default_pickup_location", sa.String(length=255), nullable=True),
        sa.Column("default_delivery_type", sa.String(length=80), nullable=True),
        sa.Column("default_package_type", sa.String(length=80), nullable=True),
        sa.Column("default_shipping_fee", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("provider", name="uq_shipping_provider_settings_provider"),
    )

    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.add_column(sa.Column("shipping_provider", sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column("shipping_provider_order_id", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("tracking_number", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("shipping_status", sa.String(length=40), nullable=True, server_default="pending"))


def downgrade():
    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.drop_column("shipping_status")
        batch_op.drop_column("tracking_number")
        batch_op.drop_column("shipping_provider_order_id")
        batch_op.drop_column("shipping_provider")

    op.drop_table("shipping_provider_settings")
