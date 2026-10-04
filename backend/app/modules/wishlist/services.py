"""منطق قائمة الأمنيات."""
from __future__ import annotations

from flask import current_app
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.extensions import db
from app.models import Product, WishlistItem


def list_wishlist(customer_id: int) -> list[WishlistItem]:
    """أمنيات العميل مع صور منتجاتها محمّلة مسبقاً."""
    query = (
        select(WishlistItem)
        .where(WishlistItem.customer_id == customer_id)
        .options(selectinload(WishlistItem.product).selectinload(Product.images))
        .order_by(WishlistItem.created_at.desc())
        .limit(current_app.config["MAX_COLLECTION_ITEMS"])
    )
    return list(db.session.execute(query).scalars())


def add_item(customer_id: int, product_id: int) -> WishlistItem:
    """إضافة سلعة — العملية idempotent: لا تخلق تكراراً."""
    product = db.session.get(Product, product_id)
    if product is None or not product.is_active:
        raise ApiError("المنتج غير موجود", status_code=404)

    existing = WishlistItem.query.filter_by(
        customer_id=customer_id, product_id=product.id
    ).first()
    if existing:
        return existing

    wishlist_item = WishlistItem(customer_id=customer_id, product_id=product.id)
    db.session.add(wishlist_item)
    db.session.commit()
    return wishlist_item


def remove_item(customer_id: int, product_id: int) -> None:
    """حذف سلعة — لا يرفع خطأً إن وُجدت أساساً (idempotent)."""
    WishlistItem.query.filter_by(customer_id=customer_id, product_id=product_id).delete()
    db.session.commit()