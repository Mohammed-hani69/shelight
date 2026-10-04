"""روتات ملف العميل — تتطلب توكن دخول."""
from __future__ import annotations

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.core.schema import load_json_or_400
from app.core.security import require_active_customer
from app.modules.customers import services as customer_service
from app.modules.customers.schemas import (
    ChangePasswordSchema,
    CustomerPublicSchema,
    ProfileUpdateSchema,
)

bp = Blueprint("customers", __name__, url_prefix="/profile")


@bp.get("")
@jwt_required()
def get_profile():
    """ملف العميل الحالي."""
    return jsonify({"data": {"customer": CustomerPublicSchema().dump(require_active_customer())}})


@bp.put("")
@jwt_required()
def update_profile():
    """تحديث الملف — الحقول الاختيارية فقط."""
    customer = customer_service.update_profile(
        require_active_customer(), load_json_or_400(ProfileUpdateSchema())
    )
    return jsonify({"data": {"customer": CustomerPublicSchema().dump(customer)}})


@bp.put("/password")
@jwt_required()
def change_password():
    """تغيير كلمة المرور — يتطلب كلمة المرور الحالية."""
    customer_service.change_password(
        require_active_customer(), load_json_or_400(ChangePasswordSchema())
    )
    return jsonify({"data": {"message": "تغيّرت كلمة المرور بنجاح"}})
