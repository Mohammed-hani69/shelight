"""منطق ملف العميل."""

from __future__ import annotations

from app.core.errors import ApiError
from app.core.security import hash_password, verify_password
from app.core.utils import normalize_phone
from app.extensions import db
from app.models import Customer, Order


def link_guest_orders(customer: Customer) -> None:
    """Attach earlier anonymous orders with the same normalized phone."""
    normalized_phone = normalize_phone(customer.phone)
    if not normalized_phone:
        return
    guest_orders = Order.query.filter_by(customer_id=None).all()
    for order in guest_orders:
        if normalize_phone(order.shipping_phone) == normalized_phone:
            order.customer_id = customer.id


def update_profile(customer: Customer, data: dict) -> Customer:
    """يحدّث الحقول المرسلة فقط — محدد حسب المفاتيح الواردة."""
    mapping = {
        "firstName": "first_name",
        "lastName": "last_name",
        "phone": "phone",
        "address": "address",
        "city": "city",
        "governorate": "governorate",
        "birthday": "birthday",
        "newsletter": "newsletter",
    }
    for data_key, attr in mapping.items():
        if data_key in data:
            setattr(customer, attr, data[data_key])
    if "phone" in data:
        customer.normalized_phone = normalize_phone(customer.phone) or None
    db.session.commit()
    return customer


def change_password(customer: Customer, data: dict) -> None:
    """يغيّر كلمة المرور بعد التحقق من الحالية."""
    if not verify_password(data["currentPassword"], customer.password_hash):
        raise ApiError("كلمة المرور الحالية غير صحيحة", status_code=401, code="wrong_password")
    customer.password_hash = hash_password(data["newPassword"])
    db.session.commit()