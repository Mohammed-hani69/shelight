"""add journey tracking tables

Revision ID: a1b2c3d4e5f6
Revises: e9d2a1f4c8b6
Create Date: 2026-10-03 15:30:00.000000

تضيف جداول تتبّع رحلة العميل (First-Party):
anonymous_visitors, visit_sessions, tracking_events,
journey_carts, journey_cart_items, checkout_sessions.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'e9d2a1f4c8b6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'anonymous_visitors',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('first_landing_url', sa.String(length=1000), nullable=True),
        sa.Column('first_referrer', sa.String(length=1000), nullable=True),
        sa.Column('first_utm_source', sa.String(length=200), nullable=True),
        sa.Column('first_utm_medium', sa.String(length=200), nullable=True),
        sa.Column('first_utm_campaign', sa.String(length=200), nullable=True),
        sa.Column('last_device_type', sa.String(length=20), nullable=True),
        sa.Column('last_user_agent', sa.String(length=500), nullable=True),
        sa.Column('sessions_count', sa.Integer(), nullable=False),
        sa.Column('events_count', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_anonymous_visitors_customer_id'), 'anonymous_visitors', ['customer_id']
    )

    op.create_table(
        'visit_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('visitor_id', sa.String(length=36), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('last_activity_at', sa.DateTime(), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('entry_url', sa.String(length=1000), nullable=True),
        sa.Column('referrer', sa.String(length=1000), nullable=True),
        sa.Column('utm_source', sa.String(length=200), nullable=True),
        sa.Column('utm_medium', sa.String(length=200), nullable=True),
        sa.Column('utm_campaign', sa.String(length=200), nullable=True),
        sa.Column('device_type', sa.String(length=20), nullable=True),
        sa.Column('page_views', sa.Integer(), nullable=False),
        sa.Column('event_count', sa.Integer(), nullable=False),
        sa.Column('is_bounce', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['visitor_id'], ['anonymous_visitors.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_visit_sessions_visitor_id'), 'visit_sessions', ['visitor_id'])
    op.create_index(op.f('ix_visit_sessions_customer_id'), 'visit_sessions', ['customer_id'])
    op.create_index(
        op.f('ix_visit_sessions_last_activity_at'), 'visit_sessions', ['last_activity_at']
    )

    op.create_table(
        'tracking_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('visitor_id', sa.String(length=36), nullable=True),
        sa.Column('session_id', sa.String(length=36), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('event_timestamp', sa.DateTime(), nullable=False),
        sa.Column('received_at', sa.DateTime(), nullable=False),
        sa.Column('page_url', sa.String(length=1000), nullable=True),
        sa.Column('referrer', sa.String(length=1000), nullable=True),
        sa.Column('path', sa.String(length=500), nullable=True),
        sa.Column('properties', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_tracking_events_event_id'), 'tracking_events', ['event_id'], unique=True)
    op.create_index(op.f('ix_tracking_events_name'), 'tracking_events', ['name'])
    op.create_index(op.f('ix_tracking_events_visitor_id'), 'tracking_events', ['visitor_id'])
    op.create_index(op.f('ix_tracking_events_session_id'), 'tracking_events', ['session_id'])
    op.create_index(op.f('ix_tracking_events_customer_id'), 'tracking_events', ['customer_id'])
    op.create_index(op.f('ix_tracking_events_event_timestamp'), 'tracking_events', ['event_timestamp'])
    op.create_index(
        'ix_tracking_events_name_time', 'tracking_events', ['name', 'event_timestamp']
    )
    op.create_index(
        'ix_tracking_events_visitor_time', 'tracking_events', ['visitor_id', 'event_timestamp']
    )
    op.create_index(
        'ix_tracking_events_session_time', 'tracking_events', ['session_id', 'event_timestamp']
    )

    op.create_table(
        'journey_carts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('visitor_id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('items_count', sa.Integer(), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('total', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('first_item_added_at', sa.DateTime(), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(), nullable=False),
        sa.Column('abandoned_at', sa.DateTime(), nullable=True),
        sa.Column('recovered_at', sa.DateTime(), nullable=True),
        sa.Column('converted_at', sa.DateTime(), nullable=True),
        sa.Column('converted_order_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['converted_order_id'], ['orders.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_journey_carts_visitor_id'), 'journey_carts', ['visitor_id'])
    op.create_index(op.f('ix_journey_carts_session_id'), 'journey_carts', ['session_id'])
    op.create_index(op.f('ix_journey_carts_customer_id'), 'journey_carts', ['customer_id'])
    op.create_index(op.f('ix_journey_carts_status'), 'journey_carts', ['status'])
    op.create_index(op.f('ix_journey_carts_last_activity_at'), 'journey_carts', ['last_activity_at'])
    op.create_index(
        'ix_journey_carts_status_activity', 'journey_carts', ['status', 'last_activity_at']
    )

    op.create_table(
        'journey_cart_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('journey_cart_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('product_name', sa.String(length=200), nullable=False),
        sa.Column('product_slug', sa.String(length=160), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=False),
        sa.Column('removed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['journey_cart_id'], ['journey_carts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_journey_cart_items_journey_cart_id'), 'journey_cart_items', ['journey_cart_id']
    )
    op.create_index(op.f('ix_journey_cart_items_product_id'), 'journey_cart_items', ['product_id'])

    op.create_table(
        'checkout_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('checkout_key', sa.String(length=64), nullable=False),
        sa.Column('visitor_id', sa.String(length=36), nullable=True),
        sa.Column('session_id', sa.String(length=36), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('order_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('step', sa.String(length=30), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=True),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('coupon_code', sa.String(length=50), nullable=True),
        sa.Column('payment_method', sa.String(length=30), nullable=True),
        sa.Column('items_count', sa.Integer(), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('discount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('shipping', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('total', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('last_activity_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('properties', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_checkout_sessions_checkout_key'), 'checkout_sessions', ['checkout_key'], unique=True
    )
    op.create_index(op.f('ix_checkout_sessions_visitor_id'), 'checkout_sessions', ['visitor_id'])
    op.create_index(op.f('ix_checkout_sessions_session_id'), 'checkout_sessions', ['session_id'])
    op.create_index(op.f('ix_checkout_sessions_customer_id'), 'checkout_sessions', ['customer_id'])
    op.create_index(op.f('ix_checkout_sessions_status'), 'checkout_sessions', ['status'])
    op.create_index(
        op.f('ix_checkout_sessions_last_activity_at'), 'checkout_sessions', ['last_activity_at']
    )
    op.create_index(
        'ix_checkout_sessions_status_activity', 'checkout_sessions', ['status', 'last_activity_at']
    )


def downgrade():
    op.drop_table('checkout_sessions')
    op.drop_table('journey_cart_items')
    op.drop_table('journey_carts')
    op.drop_table('tracking_events')
    op.drop_table('visit_sessions')
    op.drop_table('anonymous_visitors')
