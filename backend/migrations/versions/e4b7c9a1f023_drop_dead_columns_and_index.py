"""drop dead columns and add query indexes

Revision ID: e4b7c9a1f023
Revises: c3a1b2d4e5f6
Create Date: 2026-10-02 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "e4b7c9a1f023"
down_revision = "c3a1b2d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    # حقول لا يقرأها ولا يكتبها أي مسار في التطبيق.
    op.drop_column("categories", "is_featured")
    op.drop_column("products", "cost")
    # فهرسان يخدمان فلترة المتجر وترتيب الطلبات، فتمنعان مسح جدول كامل
    # في كل طلب.
    op.create_index(
        "ix_products_category_active", "products", ["category_id", "is_active"]
    )
    op.create_index(
        "ix_orders_customer_created", "orders", ["customer_id", "created_at"]
    )


def downgrade():
    op.drop_index("ix_orders_customer_created", table_name="orders")
    op.drop_index("ix_products_category_active", table_name="products")
    op.add_column("categories", sa.Column(
        "is_featured", sa.Boolean(), nullable=False, server_default=sa.false()
    ))
    op.add_column("products", sa.Column("cost", sa.Numeric(10, 2), nullable=True))
