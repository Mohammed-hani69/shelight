"""add webhook_events table

Revision ID: b7d2e5f8a1c3
Revises: c4e8a1b6d9f2
Create Date: 2026-10-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b7d2e5f8a1c3"
down_revision = "c4e8a1b6d9f2"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "webhook_events",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        # معرّف حتمي مشتق من محتوى الحدث: القيد الفريد هو ما يمنع
        # تنفيذ نفس الحدث مرتين.
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=True),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.Column("provider_event_id", sa.String(length=120), nullable=True),
        sa.Column("tracking_number", sa.String(length=120), nullable=True),
        sa.Column("provider_state_code", sa.Integer(), nullable=True),
        sa.Column("provider_state_name", sa.String(length=80), nullable=True),
        sa.Column("order_id", sa.Integer(), nullable=True),
        sa.Column("internal_status", sa.String(length=40), nullable=True),
        sa.Column("outcome", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("event_id", name="uq_webhook_events_event_id"),
    )
    op.create_index("ix_webhook_events_event_id", "webhook_events", ["event_id"])
    op.create_index("ix_webhook_events_provider", "webhook_events", ["provider"])
    op.create_index("ix_webhook_events_outcome", "webhook_events", ["outcome"])
    op.create_index(
        "ix_webhook_events_provider_event_id", "webhook_events", ["provider_event_id"]
    )
    op.create_index(
        "ix_webhook_events_tracking_number", "webhook_events", ["tracking_number"]
    )
    op.create_index("ix_webhook_events_order_id", "webhook_events", ["order_id"])
    op.create_index(
        "ix_webhook_events_provider_created",
        "webhook_events",
        ["provider", "created_at"],
    )


def downgrade():
    op.drop_index("ix_webhook_events_provider_created", table_name="webhook_events")
    op.drop_index("ix_webhook_events_order_id", table_name="webhook_events")
    op.drop_index("ix_webhook_events_tracking_number", table_name="webhook_events")
    op.drop_index("ix_webhook_events_provider_event_id", table_name="webhook_events")
    op.drop_index("ix_webhook_events_outcome", table_name="webhook_events")
    op.drop_index("ix_webhook_events_provider", table_name="webhook_events")
    op.drop_index("ix_webhook_events_event_id", table_name="webhook_events")
    op.drop_table("webhook_events")