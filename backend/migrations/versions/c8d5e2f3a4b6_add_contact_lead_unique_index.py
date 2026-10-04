"""add unique index on contact_leads (visitor_id, checkout_key)

Revision ID: c8d5e2f3a4b6
Revises: b7c4d1e2f3a4
Create Date: 2026-10-03 18:55:00.000000

يمنع إنشاء أكثر من عميل محتمل لنفس الزائر/جلسة الدفع عند تسابق طلبات الحفظ
التدريجي. القيم NULL متمايزة، فيُسمح بعدة سجلات بلا checkout_key.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'c8d5e2f3a4b6'
down_revision = 'b7c4d1e2f3a4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        'uq_contact_leads_visitor_checkout',
        'contact_leads',
        ['visitor_id', 'checkout_key'],
        unique=True,
    )


def downgrade():
    op.drop_index('uq_contact_leads_visitor_checkout', table_name='contact_leads')
