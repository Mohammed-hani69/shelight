"""روتات المصادقة: تسجيل / دخول / تجديد / حسابي."""
from __future__ import annotations

from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.core.errors import ApiError
from app.core.schema import load_json_or_400
from app.core.security import current_customer_id
from app.extensions import db
from app.models import Customer
from app.modules.auth import services as auth_service
from app.modules.auth.schemas import LoginSchema, RegisterSchema
from app.modules.customers.schemas import CustomerPublicSchema

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.post("/register")
def register():
    """تسجيل حساب جديد — يعيد accessToken + refreshToken + بيانات العميل."""
    customer, tokens = auth_service.register(load_json_or_400(RegisterSchema()))
    return jsonify({"data": tokens}), 201


@bp.post("/login")
def login():
    """دخول بحساب موجود."""
    customer, tokens = auth_service.login(load_json_or_400(LoginSchema()))
    return jsonify({"data": tokens})


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    """تجديد accessToken باستخدام refreshToken."""
    identity = get_jwt_identity()
    customer = db.session.get(Customer, int(identity))
    if customer is None or not customer.is_active:
        raise ApiError("المستخدم غير موجود", status_code=401)
    return jsonify({"data": {"accessToken": create_access_token(identity=str(customer.id))}})


@bp.get("/me")
@jwt_required()
def me():
    """بيانات العميل الحالي."""
    customer = db.session.get(Customer, current_customer_id())
    if customer is None or not customer.is_active:
        raise ApiError("المستخدم غير موجود", status_code=401)
    return jsonify({"data": {"customer": CustomerPublicSchema().dump(customer)}})