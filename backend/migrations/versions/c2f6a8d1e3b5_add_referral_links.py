"""add referral links and order attribution

Revision ID: c2f6a8d1e3b5
Revises: b3e7a1c9d5f2
Create Date: 2026-10-18 13:34:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "c2f6a8d1e3b5"
down_revision = "b3e7a1c9d5f2"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "referral_links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("inviter_name", sa.String(length=200), nullable=False),
        sa.Column("inviter_phone", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    with op.batch_alter_table("referral_links", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_referral_links_code"), ["code"], unique=False)

    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.add_column(sa.Column("referral_link_id", sa.Integer(), nullable=True))
        batch_op.create_index(
            batch_op.f("ix_orders_referral_link_id"), ["referral_link_id"], unique=False
        )
        batch_op.create_foreign_key(
            "fk_orders_referral_link_id_referral_links",
            "referral_links",
            ["referral_link_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade():
    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.drop_constraint(
            "fk_orders_referral_link_id_referral_links", type_="foreignkey"
        )
        batch_op.drop_index(batch_op.f("ix_orders_referral_link_id"))
        batch_op.drop_column("referral_link_id")

    with op.batch_alter_table("referral_links", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_referral_links_code"))
    op.drop_table("referral_links")
