"""منطق الكوبونات: التحقق من صحة الرمز وحساب الخصم."""
from __future__ import annotations

from decimal import Decimal

from app.core.errors import ApiError
from app.core.utils import utcnow
from app.models import Coupon


def get_by_code(code: str) -> Coupon | None:
    return Coupon.query.filter_by(code=code.strip().upper()).first()


def validate(code: str, subtotal: Decimal) -> Coupon:
    """يتحقق من قابلية استخدام الكوبون الآن مع هذا المجموع الفرعي."""
    coupon = get_by_code(code)
    if coupon is None or not coupon.is_active:
        raise ApiError("رمز الخصم غير صالح", status_code=404, code="invalid_coupon")

    now = utcnow()
    if coupon.valid_from and now < coupon.valid_from:
        raise ApiError("هذا الرمز غير فعّال بعد", code="coupon_not_active")
    if coupon.valid_until and now > coupon.valid_until:
        raise ApiError("انتهت صلاحية هذا الرمز", code="coupon_expired")
    if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
        raise ApiError("استُهلك هذا الرمز بالكامل", code="coupon_used_up")
    if subtotal < Decimal(coupon.min_spend):
        raise ApiError(
            f"الحد الأدنى للطلب مع هذا الرمز هو {coupon.min_spend} جنيه",
            code="min_spend_not_met",
        )
    return coupon


def discount_amount(coupon: Coupon, subtotal: Decimal) -> Decimal:
    """مقدار الخصم من المجموع الفرعي — لا يتجاوز المجموع أبداً."""
    subtotal = Decimal(subtotal)
    if coupon.discount_type == "percent":
        return min(subtotal * Decimal(coupon.value) / Decimal("100"), subtotal)
    return min(Decimal(coupon.value), subtotal)