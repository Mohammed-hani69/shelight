"""حالات Bosta الرسمية وأكوادها.

المصدر: https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook/
            -> قسم "Bosta States".

كل الأكواد والأسماء هنا منقولة عن الوثيقة الرسمية كما هي. لا تُخترع أي حالة
جديدة: أي كود غير معروف يُعتبر ``None`` ويُتجاهل بأمان في الـ webhook بدل
تخمين معنى خاطئ.

مهم: الكود 41 معناه يعتمد على ``type`` الشحنة، ووثيقة Bosta تنص على ذلك
صراحةً:
    * 41 مع SEND/FXF_SEND      -> «Heading to customer» (خارج للتوصيل)
    * 41 مع CRP/RTO/EXCHANGE  -> «Heading to you» (في الطريق للإرجاع)
لذلك يأخذ التحويل كود الحالة ونوع الشحنة معاً.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# جدول الحالات الرسمي: الكود -> (الاسم الرسمي، الأنواع التي تنطبق عليه)
# ---------------------------------------------------------------------------

#: ``code -> (official_state_name, applies_to)``.
#: ``applies_to`` من وثيقة Bosta: "All" أو نوع شحن واحد، أو مفصود بالنص.
BOSTA_STATE_TABLE: dict[int, tuple[str, str]] = {
    10: ("Pickup requested", "All (Except Cash Collection)"),
    11: ("Waiting for route", "Cash Collection"),
    20: ("Route Assigned", "All Types"),
    22: ("Picking up from consignee", "CRP, Exchange"),
    23: ("Picked up from consignee", "CRP, Exchange"),
    24: ("Received at warehouse", "All (Except Cash Collection)"),
    25: ("Fulfilled", "Fulfillment"),
    30: ("In transit between Hubs", "All (Except Cash Collection)"),
    40: ("Picking up", "Cash Collection"),
    41: ("Picked up", "Send, Exchange, CRP, RTO, Fulfillment Send"),
    45: ("Delivered", "Send, Fulfillment Send, Cash Collection"),
    46: ("Returned to business", "Exchange, CRP, RTO"),
    47: ("Exception", "All Types"),
    48: ("Terminated", "All Types"),
    49: ("Canceled", "All Types"),
    60: ("Returned to stock", "Fulfillment"),
    100: ("Lost", "All Types"),
    101: ("Damaged", "All Except (Cash Collection)"),
    102: ("Investigation", "All"),
    103: ("Awaiting your action", "Exchange, CRP, RTO"),
    104: ("Archived", "All (Except Cash Collection)"),
    105: ("On hold", "All (Except Cash Collection)"),
}

#: أسماء أنواع الشحن كما ترسلها Bosta في الحقل ``type``.
BOSTA_SHIPMENT_TYPES = frozenset(
    {
        "SEND",
        "EXCHANGE",
        "CUSTOMER_RETURN_PICKUP",
        "RTO",
        "SIGN_AND_RETURN",
        "FXF_SEND",
    }
)

# ---------------------------------------------------------------------------
# مفردات الحالة الداخلية للشحنة (``Order.shipping_status``)
#
# مفردات داخلية محايدة تجاه المزوّد وقابلة للترجمة في اللوحة. تُخزَّن في
# عمود ``shipping_status`` (String(40)) وتُقرأ في صفحة تفاصيل الطلب.
# ---------------------------------------------------------------------------

STATUS_PENDING = "pending"
STATUS_PICKED_UP = "picked_up"
STATUS_OUT_FOR_DELIVERY = "out_for_delivery"
STATUS_DELIVERED = "delivered"
STATUS_RETURNING = "returning"
STATUS_FULFILLED = "fulfilled"
STATUS_EXCEPTION = "exception"
STATUS_CANCELED = "canceled"
STATUS_TERMINATED = "terminated"
STATUS_LOST = "lost"
STATUS_DAMAGED = "damaged"
STATUS_RETURNED_TO_STOCK = "returned_to_stock"
STATUS_AWAITING_ACTION = "awaiting_action"

#: كل الحالات الداخلية المسموح كتابتها في ``Order.shipping_status``.
INTERNAL_SHIPPING_STATUSES = frozenset(
    {
        STATUS_PENDING,
        STATUS_PICKED_UP,
        STATUS_OUT_FOR_DELIVERY,
        STATUS_DELIVERED,
        STATUS_RETURNING,
        STATUS_FULFILLED,
        STATUS_EXCEPTION,
        STATUS_CANCELED,
        STATUS_TERMINATED,
        STATUS_LOST,
        STATUS_DAMAGED,
        STATUS_RETURNED_TO_STOCK,
        STATUS_AWAITING_ACTION,
    }
)

#: الحالات التي تعني «الشحنة تحرّكت من عندنا» — تُرقّي الطلب إلى ``shipped``.
MOVED_STATUSES = frozenset({STATUS_PICKED_UP, STATUS_OUT_FOR_DELIVERY})

#: الحالات النهائية (الشحنة لن تتغير بعدها) — لا تنتقل حالة الطلب بعدها.
FINAL_STATUSES = frozenset({STATUS_DELIVERED})

# ---------------------------------------------------------------------------
# التحويل: كود Bosta -> حالتنا الداخلية
#
# المفاتيح أرقام خام (كما في JSON). يقبل المحوّل أيضاً نصاً رقمياً لأن ``state``
# قد يصل نصياً من بعض النسخ.
# ---------------------------------------------------------------------------

#: تحويل مباشر لا يعتمد على نوع الشحنة.
_STATE_MAP: dict[int, str] = {
    10: STATUS_PENDING,  # Pickup requested
    11: STATUS_PENDING,  # Waiting for route
    20: STATUS_PENDING,  # Route Assigned
    24: STATUS_PENDING,  # Received at warehouse
    25: STATUS_FULFILLED,  # Fulfilled
    30: STATUS_PENDING,  # In transit between Hubs
    45: STATUS_DELIVERED,  # Delivered
    46: STATUS_RETURNING,  # Returned to business
    47: STATUS_EXCEPTION,  # Exception
    48: STATUS_TERMINATED,  # Terminated
    49: STATUS_CANCELED,  # Canceled
    60: STATUS_RETURNED_TO_STOCK,  # Returned to stock
    100: STATUS_LOST,  # Lost
    101: STATUS_DAMAGED,  # Damaged
    102: STATUS_PENDING,  # Investigation
    103: STATUS_AWAITING_ACTION,  # Awaiting your action
    104: STATUS_PENDING,  # Archived
    105: STATUS_PENDING,  # On hold
}

#: أنواع الشحن التي تعني «إرجاع» لا «توصيل».
_RETURN_TYPES = frozenset(
    {"EXCHANGE", "CUSTOMER_RETURN_PICKUP", "RTO", "SIGN_AND_RETURN"}
)

#: أنواع الشحن التي تعني «توصيل لعميل».
_DELIVERY_TYPES = frozenset({"SEND", "FXF_SEND"})

#: القيمة التي تُملأ عندما يكون نوع الشحنة من أنواع الإرجاع.
_RETURN_KEY = "__return__"

# التحويلات المعتمدة على نوع الشحنة — انظر شرح الكود 41 في أعلى الوحدة.
#   22: Picking up from consignee -> CRP/EXCHANGE: شحنة إرجاع في الطريق للمتجر
#   23: Picked up from consignee  -> شحنة إرجاع سُحبت من العميل
#   40: Picking up (Cash Collection) -> صرف نقدي من العميل
#   41: Picked up -> SEND/FXF_SEND: out for delivery | CRP/RTO/EXCHANGE: heading to you
#
# ``_RETURN_KEY`` مكتوب صراحةً لكل كود إرجاع بدل الاعتماد على قيمة افتراضية:
# الاعتماد على fallback كان يجعل 41 يُقرأ «سُحبت» بدل «في طريقها للمتجر».
_TYPE_AWARE_MAP: dict[int, dict[str, str]] = {
    22: {_RETURN_KEY: STATUS_RETURNING, STATUS_PENDING: STATUS_RETURNING},
    23: {_RETURN_KEY: STATUS_RETURNING, STATUS_PENDING: STATUS_RETURNING},
    40: {STATUS_PENDING: STATUS_PICKED_UP},
    41: {
        _RETURN_KEY: STATUS_RETURNING,
        STATUS_PENDING: STATUS_PICKED_UP,
        STATUS_OUT_FOR_DELIVERY: STATUS_OUT_FOR_DELIVERY,
    },
}


def normalize_state_code(value: object) -> int | None:
    """يرجّع كود الحالة كـ int، أو ``None`` إن لم يكن رقماً.

    Bosta ترسل ``state`` رقماً. نقبل النص الرقمي أيضاً تحسّباً، ونرفض
    ``bool`` رغم أنه صنف فرعي من ``int`` فيبايثون.
    """
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned.isdigit():
            return int(cleaned)
    return None


def state_name(code: int | None) -> str | None:
    """الاسم الرسمي للحالة كما في وثيقة Bosta — للتسجيل والتقارير."""
    if code is None:
        return None
    entry = BOSTA_STATE_TABLE.get(code)
    return entry[0] if entry else None


def normalize_type(value: object) -> str | None:
    """يرجّع نوع الشحنة بحروف كبيرة إن كان من الأنواع المعروفة."""
    if not isinstance(value, str):
        return None
    cleaned = value.strip().upper()
    return cleaned if cleaned in BOSTA_SHIPMENT_TYPES else None


def map_bosta_state(code: int | None, shipment_type: str | None = None) -> str | None:
    """يحوّل كود حالة Bosta إلى حالتنا الداخلية، أو ``None`` إذا كان مجهولاً.

    لا تخمين هنا: كود غير موجود في ``BOSTA_STATE_TABLE`` يُترك بلا معالجة
    حتى لا نخزّن معنى خاطئاً في الطلب.
    """
    if code is None or code not in BOSTA_STATE_TABLE:
        return None

    normalized_type = normalize_type(shipment_type)
    type_rules = _TYPE_AWARE_MAP.get(code)
    if type_rules is not None:
        # كل القيم تُقرأ بـ ``.get`` لا كفهرس مباشر: قيم ``dict.get`` تُقيَّم
        # فوراً، والفهرس المباشر يرفع ``KeyError`` كلما غاب المفتاح.
        if normalized_type in _RETURN_TYPES:
            # 22/23 = شحنة إرجاع من العميل، 41 = في طريقها إلى المتجر.
            return type_rules.get(_RETURN_KEY) or STATUS_RETURNING
        if normalized_type in _DELIVERY_TYPES:
            # SEND/FXF_SEND: 41 تعني «خرج للتوصيل» لا «سُحب».
            return type_rules.get(STATUS_OUT_FOR_DELIVERY) or type_rules.get(
                STATUS_PENDING
            )
        # نوع مجهول أو نوع لا يغيّر المعنى (Cash Collection مثلاً):
        # نأخذ القاعدة المحايدة دون افتراض اتجاه.
        return type_rules.get(STATUS_PENDING) or _STATE_MAP.get(code)

    return _STATE_MAP.get(code)