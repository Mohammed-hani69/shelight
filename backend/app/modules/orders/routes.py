"""روتات الطلبات: إتمام الشراء وسرد الطلبات للعميل الحالي."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.core.i18n import lang_from_args
from app.core.schema import load_json_or_400
from app.core.security import optional_active_customer_id, require_active_customer
from app.modules.orders import services as order_service
from app.modules.orders.schemas import CheckoutSchema, OrderOut, OrderTrackOut

bp = Blueprint("orders", __name__)


@bp.post("/orders/checkout")
@jwt_required(optional=True)
def checkout():
    """إنشاء طلب — يعمل للزوار وللمستخدمين المسجلين على حد سواء.

    للزائر يُرسل email اختياري، وللتسجيل يُفرَّغ سلة الحساب تلقائياً.
    """
    data = load_json_or_400(CheckoutSchema())
    visitor_id = (request.headers.get("X-Anonymous-Id") or "").strip()[:36] or None
    order = order_service.checkout(data, optional_active_customer_id(), visitor_id)
    return jsonify({"data": OrderOut(lang=lang_from_args(request.args)).dump(order)}), 201


@bp.get("/orders")
@jwt_required()
def list_orders():
    """طلبات العميل الحالي."""
    lang = lang_from_args(request.args)
    items, meta = order_service.list_customer_orders(require_active_customer().id)
    return jsonify({"data": OrderOut(many=True, lang=lang).dump(items), "meta": meta})


@bp.get("/orders/<order_number>")
@jwt_required()
def get_order(order_number: str):
    """طلب معيّن — للعميل المالك فقط."""
    order = order_service.get_customer_order(require_active_customer().id, order_number)
    return jsonify({"data": OrderOut(lang=lang_from_args(request.args)).dump(order)})


@bp.get("/orders/track/<order_number>")
def track_order(order_number: str):
    """تتبّع الطلب لزائر بلا حساب — برقم الطلب ورقم الموبايل.

    بلا مصادقة عمداً: صاحب الطلب غالباً لا يكون مسجّل دخول.
    الأمان يأتي من مطابقة الموبايل في الـ service، ومن أن المُخرَج
    لا يحمل العنوان ولا الموبايل ولا البريد.
    """
    order = order_service.track_order(order_number, request.args.get("phone", ""))
    return jsonify({"data": OrderTrackOut(lang=lang_from_args(request.args)).dump(order)})