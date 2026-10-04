"""منطق المصادقة: التسجيل والدخول وإصدار التوكنات."""
from __future__ import annotations

from flask_jwt_extended import create_access_token, create_refresh_token

from app.core.errors import ApiError
from app.core.security import hash_password, verify_password
from app.core.utils import normalize_phone
from app.extensions import db
from app.models import Customer
from app.modules.customers import services as customer_service
from app.modules.customers.schemas import CustomerPublicSchema


def register(data: dict) -> tuple[Customer, dict]:
    """ينشئ حساباً جديداً ويعيد (العميل، التوكنات)."""
    email = (data.get("email") or "").strip().lower() or None
    if email and Customer.query.filter_by(email=email).first():
        raise ApiError("البريد الإلكتروني مسجّل مسبقاً", status_code=409, code="email_taken")

    phone = (data.get("phone") or None)
    normalized_phone = normalize_phone(phone) or None
    if not email and normalized_phone and Customer.query.filter_by(normalized_phone=normalized_phone).first():
        raise ApiError("رقم الهاتف مسجّل مسبقاً", status_code=409, code="phone_taken")
    customer = Customer(
        email=email,
        first_name=data["first_name"].strip(),
        last_name=(data.get("last_name") or "").strip(),
        phone=phone,
        normalized_phone=normalized_phone,
        address=(data.get("address") or "").strip() or None,
        city=(data.get("city") or "").strip() or None,
        governorate=(data.get("governorate") or "").strip() or None,
        password_hash=hash_password(data["password"]),
        newsletter=bool(data.get("newsletter", False)),
    )
    db.session.add(customer)
    db.session.flush()
    customer_service.link_guest_orders(customer)
    db.session.commit()
    return customer, build_tokens(customer)


def login(data: dict) -> tuple[Customer, dict]:
    """يتحقق من البيانات ويعيد (العميل، التوكنات)."""
    if data.get("phone"):
        customer = Customer.query.filter_by(
            normalized_phone=normalize_phone(data["phone"])
        ).first()
    else:
        email = (data.get("email") or "").strip().lower()
        customer = Customer.query.filter_by(email=email).first()
    if customer is None or not verify_password(data["password"], customer.password_hash):
        raise ApiError("بيانات الدخول غير صحيحة", status_code=401, code="invalid_credentials")
    if not customer.is_active:
        raise ApiError("الحساب موقوف مؤقتاً", status_code=403, code="account_disabled")
    return customer, build_tokens(customer)


def build_tokens(customer: Customer) -> dict:
    """يبني التوكنات وبيانات العميل العامة دفعة واحدة."""
    identity = str(customer.id)
    return {
        "accessToken": create_access_token(identity=identity),
        "refreshToken": create_refresh_token(identity=identity),
        "customer": CustomerPublicSchema().dump(customer),
    }