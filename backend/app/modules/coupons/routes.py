"""روتات الكوبونات."""
from __future__ import annotations

from decimal import Decimal

from flask import Blueprint, jsonify

from app.core.schema import load_json_or_400
from app.modules.coupons import services as coupon_service
from app.modules.coupons.schemas import CouponValidateSchema

bp = Blueprint("coupons", __name__)


@bp.post("/coupons/validate")
def validate_coupon():
    """يتحقق من رمز الخصم ويعيد مبلغ الخصم المتوقع لطلبية معينة."""
    data = load_json_or_400(CouponValidateSchema())
    subtotal = Decimal(str(data["subtotal"]))
    coupon = coupon_service.validate(data["code"], subtotal)
    return jsonify(
        {
            "data": {
                "valid": True,
                "code": coupon.code,
                "discountType": coupon.discount_type,
                "discountAmount": float(coupon_service.discount_amount(coupon, subtotal)),
            }
        }
    )