"""add referral rewards

Revision ID: d4a8c2f9b671
Revises: c2f6a8d1e3b5
Create Date: 2026-10-18 14:34:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "d4a8c2f9b671"
down_revision = "c2f6a8d1e3b5"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("coupons", schema=None) as batch_op:
        batch_op.add_column(sa.Column("restricted_phone", sa.String(length=32), nullable=True))

    with op.batch_alter_table("referral_links", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "reward_percent",
                sa.Numeric(precision=5, scale=2),
                nullable=False,
                server_default="10",
            )
        )

    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("referral_reward_coupon_code", sa.String(length=50), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "referral_reward_percent",
                sa.Numeric(precision=5, scale=2),
                nullable=True,
            )
        )


def downgrade():
    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.drop_column("referral_reward_percent")
        batch_op.drop_column("referral_reward_coupon_code")

    with op.batch_alter_table("referral_links", schema=None) as batch_op:
        batch_op.drop_column("reward_percent")

    with op.batch_alter_table("coupons", schema=None) as batch_op:
        batch_op.drop_column("restricted_phone")
