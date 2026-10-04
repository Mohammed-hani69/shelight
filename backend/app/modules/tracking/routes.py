"""روتات التتبّع — استقبال الأحداث العامة وربط الزائر بالحساب."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required

from app.core.errors import ApiError
from app.core.schema import load_json_or_400
from app.core.security import optional_active_customer_id, require_active_customer
from app.modules.tracking import services as tracking_service
from app.modules.tracking.schemas import (
    CheckoutLeadSchema,
    IdentifySchema,
    TrackBatchSchema,
)

bp = Blueprint("tracking", __name__, url_prefix="/tracking")


def _device_from_ua(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if any(token in ua for token in ("ipad", "tablet")):
        return "tablet"
    if any(token in ua for token in ("mobi", "android", "iphone")):
        return "mobile"
    return "desktop"


def _visitor_id() -> str | None:
    """معرّف الزائر من الترويسة، مقتطعاً لسقف الطول المعرّف."""
    raw = (request.headers.get("X-Anonymous-Id") or "").strip()
    return raw[:36] or None


def _request_meta() -> dict:
    user_agent = request.headers.get("User-Agent", "")
    return {
        "userAgent": user_agent,
        "deviceType": _device_from_ua(user_agent),
        "utmSource": request.args.get("utm_source"),
        "utmMedium": request.args.get("utm_medium"),
        "utmCampaign": request.args.get("utm_campaign"),
    }


@bp.post("/events")
@jwt_required(optional=True)
def ingest_events():
    """يستقبل دفعة أحداث من الواجهة — يعمل للزوار وللمسجّلين.

    الزائر يُعرَّف عبر ترويسة `X-Anonymous-Id`، والعميل عبر توكن JWT.
    """
    if not current_app.config["TRACKING_ENABLED"]:
        return jsonify({"data": {"accepted": 0}})
    data = load_json_or_400(TrackBatchSchema())
    if len(data["events"]) > current_app.config["TRACKING_MAX_BATCH"]:
        raise ApiError(
            "عدد الأحداث أكبر من المسموح", status_code=413, code="batch_too_large"
        )
    visitor_id = _visitor_id() or (data.get("anonymousId") or None)
    accepted = tracking_service.ingest_events(
        data["events"], visitor_id, optional_active_customer_id(), _request_meta()
    )
    return jsonify({"data": {"accepted": accepted}})


@bp.post("/checkout-lead")
@jwt_required(optional=True)
def checkout_lead():
    """حفظ تدريجي لهوية العميل المحتمل أثناء الدفع — بلا بريد إلكتروني.

    يُستدعى من الواجهة عند الكتابة (debounce) وعند مغادرة الحقل (onBlur)،
    فيظهر العميل في لوحة السلال المتروكة قبل إتمام الطلب.
    """
    if not current_app.config["TRACKING_ENABLED"]:
        return jsonify({"data": {"saved": False}})
    data = load_json_or_400(CheckoutLeadSchema())
    visitor_id = _visitor_id() or (data.get("anonymousId") or None)
    lead = tracking_service.save_checkout_lead(
        data, visitor_id, optional_active_customer_id(), _request_meta()
    )
    if lead is None:
        return jsonify({"data": {"saved": False}})
    return jsonify(
        {
            "data": {
                "saved": True,
                "id": str(lead.id),
                "status": lead.status,
                "normalizedPhone": lead.normalized_phone,
            }
        }
    )


@bp.post("/identify")
@jwt_required()
def identify():
    """يربط الزائر المجهول بالحساب المسجَّل ويُرحّل رحلته السابقة إليه."""
    data = load_json_or_400(IdentifySchema())
    linked = tracking_service.link_visitor_to_customer(
        data["anonymousId"], require_active_customer().id
    )
    return jsonify({"data": {"linked": linked}})
