"""روتات السلة — كلها تتطلب توكن دخول."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.core.i18n import lang_from_args
from app.core.schema import load_json_or_400
from app.core.security import require_active_customer
from app.modules.cart import services as cart_service
from app.modules.cart.schemas import CartItemAddSchema, CartItemUpdateSchema

bp = Blueprint("cart", __name__, url_prefix="/cart")


@bp.get("")
@jwt_required()
def get_cart():
    """السلة الكاملة مع الملخص المالي."""
    return jsonify({"data": cart_service.get_cart(require_active_customer().id, lang_from_args(request.args))})


@bp.post("/items")
@jwt_required()
def add_item():
    """إضافة منتج أو رفع كميته."""
    data = load_json_or_400(CartItemAddSchema())
    payload = cart_service.add_item(
        require_active_customer().id, data["productId"], data["quantity"], lang_from_args(request.args)
    )
    return jsonify({"data": payload})


@bp.patch("/items/<int:item_id>")
@jwt_required()
def update_item(item_id: int):
    """تحديث كمية عنصر."""
    data = load_json_or_400(CartItemUpdateSchema())
    payload = cart_service.update_item(
        require_active_customer().id, item_id, data["quantity"], lang_from_args(request.args)
    )
    return jsonify({"data": payload})


@bp.delete("/items/<int:item_id>")
@jwt_required()
def remove_item(item_id: int):
    """حذف عنصر من السلة."""
    payload = cart_service.remove_item(
        require_active_customer().id, item_id, lang_from_args(request.args)
    )
    return jsonify({"data": payload})
