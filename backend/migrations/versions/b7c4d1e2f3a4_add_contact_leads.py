"""add contact leads and customer normalized phone

Revision ID: b7c4d1e2f3a4
Revises: a1b2c3d4e5f6
Create Date: 2026-10-03 18:30:00.000000

يضيف جدول العملاء المحتملين (Lead Capture بلا بريد إلكتروني) وعمود
الهاتف الموحّد على العملاء لمطابقة الهوية ومنع تكرار العملاء.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7c4d1e2f3a4'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def _normalize_phone(raw: str | None) -> str | None:
    """نفس منطق app.core.utils.normalize_phone — بلا استيراد كود التطبيق."""
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    for prefix in ("0020", "20"):
        if digits.startswith(prefix):
            digits = digits[len(prefix):]
            break
    if digits.startswith("0"):
        digits = digits[1:]
    return digits or None


def upgrade():
    op.create_table(
        'contact_leads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('visitor_id', sa.String(length=36), nullable=True),
        sa.Column('session_id', sa.String(length=36), nullable=True),
        sa.Column('checkout_key', sa.String(length=64), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('full_name', sa.String(length=200), nullable=True),
        sa.Column('primary_phone', sa.String(length=32), nullable=True),
        sa.Column('normalized_phone', sa.String(length=32), nullable=True),
        sa.Column('secondary_phone', sa.String(length=32), nullable=True),
        sa.Column('address', sa.String(length=300), nullable=True),
        sa.Column('city', sa.String(length=120), nullable=True),
        sa.Column('governorate', sa.String(length=120), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('recovery_status', sa.String(length=20), nullable=False),
        sa.Column('contact_eligible', sa.Boolean(), nullable=False),
        sa.Column('first_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_activity_at', sa.DateTime(), nullable=False),
        sa.Column('abandoned_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_contact_leads_visitor_id'), 'contact_leads', ['visitor_id'])
    op.create_index(op.f('ix_contact_leads_checkout_key'), 'contact_leads', ['checkout_key'])
    op.create_index(op.f('ix_contact_leads_customer_id'), 'contact_leads', ['customer_id'])
    op.create_index(
        op.f('ix_contact_leads_normalized_phone'), 'contact_leads', ['normalized_phone'], unique=True
    )
    op.create_index(op.f('ix_contact_leads_last_activity_at'), 'contact_leads', ['last_activity_at'])
    op.create_index(
        'ix_contact_leads_visitor_activity', 'contact_leads', ['visitor_id', 'last_activity_at']
    )

    op.add_column('customers', sa.Column('normalized_phone', sa.String(length=32), nullable=True))
    op.create_index(
        op.f('ix_customers_normalized_phone'), 'customers', ['normalized_phone']
    )

    # تعبئة الهاتف الموحّد للعملاء الحاليين.
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, phone FROM customers WHERE phone IS NOT NULL")).fetchall()
    for row in rows:
        normalized = _normalize_phone(row.phone)
        if normalized:
            bind.execute(
                sa.text("UPDATE customers SET normalized_phone = :value WHERE id = :id"),
                {"value": normalized, "id": row.id},
            )


def downgrade():
    op.drop_index(op.f('ix_customers_normalized_phone'), table_name='customers')
    with op.batch_alter_table('customers') as batch:
        batch.drop_column('normalized_phone')
    op.drop_table('contact_leads')
