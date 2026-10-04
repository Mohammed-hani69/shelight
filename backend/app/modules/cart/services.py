"""منطق السلة — مقيدة بحساب العميل (الزائر يخزّن سّلته في الواجهة).

الإخراج يطابق عقد `cartStore` في الواجهة حرفياً.
"""
from __future__ import annotations

from flask import current_app
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.constants import FREE_SHIPPING_THRESHOLD, SHIPPING_COST
from app.core.errors import ApiError
from app.core.i18n import DEFAULT_LANG, localized
from app.extensions import db
from app.models import CartItem, Product


def _cart_payload(items: list[CartItem], lang: str = DEFAULT_LANG) -> dict:
    """يبني تمثيل السلة: عناصر + ملخص مالي مطابق لحسبة الواجهة."""
    out: list[dict] = []
    for cart_item in items:
        product = cart_item.product
        out.append(
            {
                "id": str(cart_item.id),
                "productId": str(product.id),
                "productSlug": product.slug,
                "name": localized(product, "name", lang),
                "price": float(product.price),
                "image": product.primary_image_url,
                "quantity": cart_item.quantity,
                "stock": product.stock,
            }
        )
    subtotal = round(sum(item["price"] * item["quantity"] for item in out), 2)
    shipping = 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD else float(SHIPPING_COST)
    return {
        "items": out,
        "subtotal": subtotal,
        "shipping": shipping,
        "discount": 0.0,
        "total": round(subtotal + shipping, 2),
        "freeShippingThreshold": FREE_SHIPPING_THRESHOLD,
    }


def _items_query(customer_id: int):
    """سلة العميل مع صور منتجاته محمّلة مسبقاً وسقف لعدد العناصر."""
    return (
        select(CartItem)
        .where(CartItem.owner_id == customer_id)
        .options(selectinload(CartItem.product).selectinload(Product.images))
        .order_by(CartItem.created_at.asc())
        .limit(current_app.config["MAX_COLLECTION_ITEMS"])
    )


def get_cart(customer_id: int, lang: str = DEFAULT_LANG) -> dict:
    return _cart_payload(list(db.session.execute(_items_query(customer_id)).scalars()), lang)


def add_item(customer_id: int, product_id: int, quantity: int, lang: str = DEFAULT_LANG) -> dict:
    """يضيف منتجاً للسلة أو يرفع كميته — ملتزماً بالمخزون المتاح."""
    product = db.session.get(Product, product_id)
    if product is None or not product.is_active:
        raise ApiError("المنتج غير موجود", status_code=404)
    if product.stock <= 0:
        raise ApiError("المنتج غير متوفر حالياً", status_code=409, code="out_of_stock")

    max_qty = min(product.stock, 99)
    cart_item = CartItem.query.filter_by(owner_id=customer_id, product_id=product.id).first()
    if cart_item:
        cart_item.quantity = min(cart_item.quantity + quantity, max_qty)
    else:
        cart_item = CartItem(
            owner_id=customer_id, product_id=product.id, quantity=min(quantity, max_qty)
        )
        db.session.add(cart_item)
    db.session.commit()
    return get_cart(customer_id, lang)


def update_item(
    customer_id: int, item_id: int, quantity: int, lang: str = DEFAULT_LANG
) -> dict:
    """يغيّر كمية عنصر — ملتزماً بحد المخزون."""
    cart_item = CartItem.query.filter_by(id=item_id, owner_id=customer_id).first()
    if cart_item is None:
        raise ApiError("العنصر غير موجود في السلة", status_code=404)
    product = cart_item.product
    max_qty = min(product.stock, 99) if product.stock > 0 else 99
    cart_item.quantity = max(1, min(quantity, max_qty))
    db.session.commit()
    return get_cart(customer_id, lang)


def remove_item(customer_id: int, item_id: int, lang: str = DEFAULT_LANG) -> dict:
    cart_item = CartItem.query.filter_by(id=item_id, owner_id=customer_id).first()
    if cart_item is None:
        raise ApiError("العنصر غير موجود في السلة", status_code=404)
    db.session.delete(cart_item)
    db.session.commit()
    return get_cart(customer_id, lang)