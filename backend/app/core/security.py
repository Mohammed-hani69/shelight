"""أدوات أمنية: تجزئة كلمات المرور، هوية المستخدم، ومتطلّبات الأدوار."""
from __future__ import annotations

from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from app.core.errors import ApiError
from app.extensions import db
from app.models import Customer


def hash_password(plain: str) -> str:
    return generate_password_hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return check_password_hash(hashed, plain)


def current_customer_id() -> int | None:
    """معرّف المستخدم الحالي من التوكن، أو None عندما لا يوجد توكن صالح."""
    identity = get_jwt_identity()
    if identity is None:
        return None
    try:
        return int(identity)
    except (TypeError, ValueError):
        return None


def require_active_customer() -> Customer:
    """يعيد العميل الحالي النشط أو يرمي 401 — للاستخدام بعد @jwt_required."""
    customer_id = current_customer_id()
    customer = db.session.get(Customer, customer_id) if customer_id else None
    if customer is None or not customer.is_active:
        raise ApiError("المستخدم غير موجود", status_code=401, code="invalid_token")
    return customer


def optional_active_customer_id() -> int | None:
    """معرّف العميل الحالي إن وُجد توكن صالح لعميل نشط، وإلا None.

    تُستخدم في مسارات تسمح بالزوار (مثل إتمام الشراء بتسجيل دخول اختياري)
    — تُرجع None بصمت بدل أن ترمي خطأً.
    """
    customer_id = current_customer_id()
    if customer_id is None:
        return None
    customer = db.session.get(Customer, customer_id)
    if customer is None or not customer.is_active:
        return None
    return customer.id


def admin_required():
    """مزيّن (بصيغة مصنع كما jwt_required) يحصر الوصول بالمدراء.

    السلطة تُقرأ من قاعدة البيانات كل طلب (لا من التوكن) — موثوقة حتى لو
    حُدِّث دور المستخدم، ويُوضع العميل في flask.g.current_admin.
    """

    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            customer = require_active_customer()
            if not customer.is_admin:
                raise ApiError(
                    "تتطلب هذه العملية صلاحيات مدير", status_code=403, code="forbidden"
                )
            g.current_admin = customer
            return fn(*args, **kwargs)

        return wrapper

    return decorator