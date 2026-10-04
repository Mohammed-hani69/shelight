"""روتات قائمة الأمنيات — تتطلب توكن دخول."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.core.i18n import lang_from_args, localized
from app.core.schema import load_json_or_400
from app.core.security import require_active_customer
from app.modules.wishlist import services as wishlist_service
from app.modules.wishlist.schemas import WishlistAddSchema

bp = Blueprint("wishlist", __name__, url_prefix="/wishlist")


def _payload(wishlist_items, lang: str) -> list[dict]:
    return [
        {
            "id": str(item.id),
            "productId": str(item.product.id),
            "slug": item.product.slug,
            "name": localized(item.product, "name", lang),
            "price": float(item.product.price),
            "image": item.product.primary_image_url,
        }
        for item in wishlist_items
    ]


@bp.get("")
@jwt_required()
def get_wishlist():
    """قائمة الأمنيات الكاملة."""
    items = wishlist_service.list_wishlist(require_active_customer().id)
    return jsonify({"data": _payload(items, lang_from_args(request.args))})


@bp.post("/items")
@jwt_required()
def add_item():
    """إضافة سلعة للأمنيات — لا تكرر العنصر."""
    data = load_json_or_400(WishlistAddSchema())
    wishlist_service.add_item(require_active_customer().id, data["productId"])
    items = wishlist_service.list_wishlist(require_active_customer().id)
    return jsonify({"data": _payload(items, lang_from_args(request.args))}), 201


@bp.delete("/items/<int:product_id>")
@jwt_required()
def remove_item(product_id: int):
    """حذف سلعة من الأمنيات بمعرّف المنتج (لا التزام بمعرّف العنصر)."""
    wishlist_service.remove_item(require_active_customer().id, product_id)
    items = wishlist_service.list_wishlist(require_active_customer().id)
    return jsonify({"data": _payload(items, lang_from_args(request.args))})