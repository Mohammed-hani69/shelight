"""نقطة استقبال webhooks مزوّدي الشحن.

المسار النهائي: ``POST /api/webhooks/bosta``
(بلوبريانت ``/api/webhooks`` + المسار ``/bosta``، مسجَّل على مستوى التطبيق
خارج ``/api/v1`` حتى لا يقع تحت مسار الـ API المحمي أو تحت Next.js).

هذه الطبقة HTTP رقيقة: تتحقق من الهوية، تفكّك الـ JSON، ثم تفوّض كل المنطق
إلى `webhook_events.process_bosta_event` الذي يُختبر منفرداً.

رموز الرد:
    200 — تمت المعالجة، أو مكرر، أو شحنة/حالة غير معروفة (لا جدوى من إعادة
          الإرسال في هذه الحالات).
    400 — حمولة غير صالحة (JSON مكسور، أو نوع غير متوقع، أو حقل `state`
          مفقود/غير رقمي: لا يصف الحدث حالة).
    401 — فشل التحقق من الهوية.
    413 — حجم الطلب أكبر من المسموح.
    503 — لا يوجد سر تحقّق مُعد (الـ endpoint مغلق عمداً).
    500 — خطأ داخلي (قاعدة البيانات مثلاً).
"""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request
from marshmallow import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.modules.shipping.bosta.schemas import BostaWebhookSchema
from app.modules.shipping.bosta.states import normalize_state_code
from app.modules.shipping.bosta.verification import verify_webhook_request
from app.modules.shipping.webhook_events import (
    OUTCOME_DUPLICATE,
    OUTCOME_PROCESSED,
    OUTCOME_UNKNOWN_SHIPMENT,
    OUTCOME_UNKNOWN_STATUS,
    process_bosta_event,
)

bp = Blueprint("shipping_webhooks", __name__, url_prefix="/api/webhooks")

#: أقصى حجم لحمولة الـ webhook (64KB) — سخاء جداً على حمولة Bosta.
_MAX_BODY_BYTES = 64 * 1024


def _error(code: str, message: str, status: int):
    """استجابة خطأ بنفس صيغة `app.core.errors` ليبقى الشكل موحّداً."""
    return jsonify({"error": {"code": code, "message": message}}), status


@bp.post("/bosta")
def handle_bosta_webhook():
    """يستقبل تحديث حالة شحنة من Bosta.

    لا يُطبَّق عليه `@admin_required`: المستدعي هو خادم Bosta لا مستخدم
    لوحة. الأمان هنا من التحقق بترويسة سرية (الطريقة الرسمية من Bosta)، لا
    من مصادقة الجلسة.
    """
    # 1) الهوية أولاً — قبل أي قراءة للـ payload أو أي كتابة.
    verification = verify_webhook_request(request)
    if not verification.ok:
        if verification.reason == "not_configured":
            # 503 يفصل «الendpoint غير مُعد على الخادم» عن «أنت غير
            # مصرّح لك» — وهو التمييز العملي لمن يجهّز لوحة Bosta.
            return _error(
                "webhook_not_configured",
                "Bosta webhook is not configured on this server.",
                503,
            )
        return _error("unauthorized", "Invalid webhook credentials.", 401)

    current_app.logger.info("Bosta webhook verified")

    # 2) قراءة الجسم بحجم محدود — حمولة Bosta JSON صغيرة جداً.
    if request.content_length and request.content_length > _MAX_BODY_BYTES:
        return _error("payload_too_large", "Webhook payload is too large.", 413)

    payload = request.get_json(silent=True, force=True)
    if not isinstance(payload, dict):
        return _error(
            "invalid_payload", "Webhook payload must be a JSON object.", 400
        )

    # 3) تفكيك الأسماء الموثّقة فقط؛ ما لا نعرفه يُتجاهل بصمت.
    try:
        event = BostaWebhookSchema().load(payload)
    except ValidationError as err:
        # أسماء الحقول فقط: رسائل Marshmallow قد تعكس قيمة الحقل المُرفض،
        # ولا نريد ذلك في السجلات.
        current_app.logger.warning(
            "Bosta webhook rejected - schema validation failed on fields: %s",
            sorted(err.messages.keys()),
        )
        return _error("invalid_payload", "Webhook payload failed validation.", 400)

    # غياب `_id` و `trackingNumber` معاً يعني أننا لا نستطيع ربط الحدث بطلب.
    # قبوله يُسقط تغيير حالة حقيقي بصمت، لذا نرفضه.
    if not event.get("_id") and not event.get("trackingNumber"):
        return _error(
            "invalid_payload",
            "Webhook payload must carry either '_id' or 'trackingNumber'.",
            400,
        )

    # Bosta ترسل `state` دائماً؛ وغيابه يعني حدثاً لا يصف حالة، فنخزّنه كـ
    # «حالة مجهولة». الأفضل رفضه: لا جدوى من إعادة Bosta إرسال حمولة ناقصة،
    # و«200 بلا تحديث» يخفي خطأ تكامل حقيقي.
    state_code = normalize_state_code(event.get("state"))
    if state_code is None:
        current_app.logger.warning(
            "Bosta webhook rejected - missing or non-numeric 'state' field"
        )
        return _error(
            "invalid_payload",
            "Webhook payload must carry a numeric 'state' field.",
            400,
        )

    # 4) المعالجة (منع تكرار + تحديث).
    try:
        result = process_bosta_event(event)
    except SQLAlchemyError:
        # المعالج سجّل الاستثناء وتراجع عن الجلسة بالفعل.
        return _error(
            "internal_error", "Failed to process the webhook event.", 500
        )

    if result.outcome == OUTCOME_DUPLICATE:
        current_app.logger.info(
            "Bosta webhook ignored - duplicate: order_id=%s order_number=%s",
            result.order_id,
            result.order_number,
        )
    elif result.outcome == OUTCOME_UNKNOWN_SHIPMENT:
        current_app.logger.warning(
            "Bosta webhook ignored - unknown shipment: shipment_id=%s "
            "tracking_number=%s",
            result.provider_event_id,
            result.tracking_number,
        )
    elif result.outcome == OUTCOME_UNKNOWN_STATUS:
        current_app.logger.warning(
            "Bosta webhook ignored - unknown status code: state_code=%s "
            "shipment_id=%s",
            result.provider_state_code,
            result.provider_event_id,
        )
    elif result.outcome == OUTCOME_PROCESSED:
        current_app.logger.info(
            "Bosta shipment status updated: order_id=%s order_number=%s "
            "shipment_id=%s tracking_number=%s shipping_status=%s "
            "order_status_changed=%s",
            result.order_id,
            result.order_number,
            result.provider_event_id,
            result.tracking_number,
            result.internal_status,
            result.order_status_changed,
        )

    # 200 في كل الحالات المعالَجة: إعادة الإرسال لن تغيّر النتيجة، وردّ
    # غير 2xx يجعل Bosta تعيد الإرسال إلى الأبد.
    return (
        jsonify(
            {
                "data": {
                    "received": True,
                    "outcome": result.outcome,
                    "orderId": str(result.order_id) if result.order_id is not None else None,
                    "shippingStatus": result.internal_status,
                    "providerStateCode": result.provider_state_code,
                }
            }
        ),
        200,
    )