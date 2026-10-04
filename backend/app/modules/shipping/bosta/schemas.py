"""مخططات Bosta — مبنية على الوثائق الرسمية.

المصدر: https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook/
            -> قسم "How to use" (حقول webhook وأنواعها).

كل الحقول هنا بأسمائها وأنواعها كما توثّقها Bosta. أي حقل غير مذكور في
الوثيقة لا يُقرأ ولا يُخترع.
"""
from __future__ import annotations

from marshmallow import EXCLUDE, Schema, fields, validate


class BostaWebhookSchema(Schema):
    """حمولة تحديث حالة الشحنة كما ترسلها Bosta.

    الحقول المطلوبة للتحديد هي `_id` أو `trackingNumber` — إحداهما تكفي
    للربط بالطلب. بقية الحقول اختيارية وتُستعمل عند وجودها فقط.

    ``state`` رقم في الوثيقة، لكن يُقبل نصاً أيضاً (بعض النسخ ترسله نصاً)
    فيُقرأ كنص خام ثم يُحوَّل عبر `states.normalize_state_code`.
    """

    class Meta:
        # حقول Bosta الإضافية (مثل_details أو _metadata) تُتجاهل بصمت
        # بدل أن يرفض marshmallow الطلب بحقل غير معروف.
        unknown = EXCLUDE

    # معرّف الشحنة عند Bosta (String).
    _id = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=120))
    # رقم التتبّع — الوثيقة تعلن String لكن الأمثلة تُظهر رقماً.
    trackingNumber = fields.Raw(load_default=None, allow_none=True)
    # كود الحالة (Number).
    state = fields.Raw(load_default=None, allow_none=True)
    # نوع الشحنة: SEND | EXCHANGE | CUSTOMER_RETURN_PICKUP | RTO |
    # SIGN_AND_RETURN | FXF_SEND
    type = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=40))
    # المبلغ المحصَّل — يظهر في حالة التسليم فقط (Number).
    cod = fields.Raw(load_default=None, allow_none=True)
    # طابع زمني بالمللي ثانية (Number).
    timeStamp = fields.Raw(load_default=None, allow_none=True)
    # إثبات تسليم (Boolean).
    isConfirmedDelivery = fields.Raw(load_default=None, allow_none=True)
    # موعد التسليم promised بصيغة DD-MM-YYYY.
    deliveryPromiseDate = fields.Str(
        load_default=None, allow_none=True, validate=validate.Length(max=32)
    )
    # سبب الاستثناء (NDR) — في حالة Exception فقط.
    exceptionReason = fields.Str(
        load_default=None, allow_none=True, validate=validate.Length(max=500)
    )
    # كود سبب الاستثناء (Number).
    exceptionCode = fields.Raw(load_default=None, allow_none=True)
    # القيمة التي أرسلها التاجر عند إنشاء الشحنة.
    businessReference = fields.Str(
        load_default=None, allow_none=True, validate=validate.Length(max=120)
    )
    # عدد محاولات التسليم (Number).
    numberOfAttempts = fields.Raw(load_default=None, allow_none=True)


class BostaShipmentSchema(Schema):
    """حقول الشحنة كما يستخدمها كود المشروع حالياً.

    غير مستخدَمة في المسارات: `BostaClient.create_shipment` ما زال
    placeholder بانتظار نقاط النهاية الرسمية لـ
    `POST /api/v2/deliveries?apiVersion=1` (انظر TODO في
    `app/modules/shipping/bosta/client.py`). أُبقيت كما هي حتى لا تُفقد.
    """

    class Meta:
        unknown = EXCLUDE

    orderNumber = fields.Str(load_default=None, allow_none=True)
    trackingNumber = fields.Str(load_default=None, allow_none=True)
    shipmentId = fields.Str(load_default=None, allow_none=True)
    status = fields.Str(load_default=None, allow_none=True)
    provider = fields.Str(load_default="bosta")