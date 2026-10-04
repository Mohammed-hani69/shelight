"""معالجة أحداث الـ webhook الواردة من مزوّدي الشحن.

يفصل هذا الملف «منطق المعالجة» عن طبقة HTTP (`webhook.py`) ليُختبر منفرداً
ويُستخدم من أي نقطة استقبال.

المسار:
    payload -> التحقق من الهوية -> استخراج المعرّفات -> منع التكرار ->
    إيجاد الطلب -> تحويل الحالة -> تحديث الشحنة والطلب -> تسجيل

قواعد صارمة:
    * لا يُنشأ طلب جديد أبداً. شحنة غير معروفة تُسجَّل وتُتجاهل.
    * الحالة لا يتراجع فيها الطلب: تقدّم فقط، ولا تُلمس الطلبات المُنهية.
    * لا تُسجَّل الأسرار ولا بيانات العميل، ولا الـ payload كاملاً.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.models import Order, WebhookEvent
from app.modules.shipping.bosta.states import (
    MOVED_STATUSES,
    STATUS_DELIVERED,
    STATUS_OUT_FOR_DELIVERY,
    STATUS_PENDING,
    STATUS_PICKED_UP,
    map_bosta_state,
    normalize_state_code,
    normalize_type,
    state_name,
)

#: مزوّد Bosta كما يُخزَّن في `WebhookEvent.provider`.
PROVIDER = "bosta"

#: Outcomes recorded on `WebhookEvent.outcome`.
OUTCOME_PROCESSED = "processed"
OUTCOME_DUPLICATE = "duplicate"
OUTCOME_UNKNOWN_SHIPMENT = "unknown_shipment"
OUTCOME_UNKNOWN_STATUS = "unknown_status"
OUTCOME_FAILED = "failed"


@dataclass(frozen=True)
class ProcessResult:
    """نتيجة معالجة حدث واحد — يقرأها الـ HTTP layer ليصوغ الرد."""

    outcome: str
    order_id: int | None = None
    order_number: str | None = None
    internal_status: str | None = None
    provider_state_code: int | None = None
    provider_state_name: str | None = None
    tracking_number: str | None = None
    provider_event_id: str | None = None
    order_status_changed: bool = False

    @property
    def is_duplicate(self) -> bool:
        return self.outcome == OUTCOME_DUPLICATE


def _canonical_json(payload: dict[str, Any]) -> str:
    """JSON حتمي (ترتيب مفاتيح ثابت) لحساب بصمة ثابتة للـ payload."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def _tracking_as_text(value: object) -> str | None:
    """رقم التتبّع كنص.

    الوثيقة تعلن `trackingNumber` String لكن الأمثلة Official تُظهر رقماً
    (`48089608`)، وقد muscul safely ينساه التاجر كسلسلة. نحوّله لنص في الحالتين
    حتى يجد `Order.tracking_number` (String) المطابقة في الحالتين.
    """
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        # float لا يحدث في الواقع، لكن 48089608.0 يجب ألا يخزَّن هكذا.
        return str(int(value))
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    return None


def build_event_id(provider: str, provider_event_id: str | None, tracking: str | None,
                   state_code: int | None, timestamp: object) -> str:
    """معرّف حتمي للحدث مشتقّ من محتواه.

    Bosta لا ترسل معرّفاً فريداً للحدث، فنركّب واحداً من
    (المزوّد + معرّف الشحنة + كود الحالة + الطابع الزمني). إعادة إرسال نفس
    تغيير الحالة تعطي نفس المعرّف فيتكرر القيد، وتغيير حالة جديد يعطي
    معرّفاً مختلفاً فيُعالَج.
    """
    parts = "|".join(
        [
            provider,
            provider_event_id or "-",
            tracking or "-",
            "" if state_code is None else str(state_code),
            "" if timestamp is None else str(timestamp),
        ]
    )
    return hashlib.sha256(parts.encode("utf-8")).hexdigest()


def find_order(provider_event_id: str | None, tracking: str | None) -> Order | None:
    """يجد الطلب عبر معرّف Bosta ثم رقم التتبّع.

    الترتيب مهم: `_id` معرّف مُعرَّف من Bosta وهو أدق من رقم التتبّع، لذا
    يُجرَّب أولاً.
    """
    if provider_event_id:
        order = Order.query.filter_by(
            shipping_provider=PROVIDER,
            shipping_provider_order_id=str(provider_event_id),
        ).first()
        if order is not None:
            return order

    if tracking:
        order = Order.query.filter_by(tracking_number=str(tracking)).first()
        if order is not None:
            return order

    return None


#: ترتيب التقدّم الطبيعي للشحنة. أي حالة خارج هذا التسلسل (استثناء، فقد،
#: تلف، إرجاع، إلغاء، terminated) تُعامل كاستثناء يصل في أي وقت.
SHIPMENT_PROGRESSION: dict[str, int] = {
    STATUS_PENDING: 0,
    STATUS_PICKED_UP: 1,
    STATUS_OUT_FOR_DELIVERY: 2,
    STATUS_DELIVERED: 3,
}


def _apply_shipment_status(order: Order, internal_status: str, logger) -> tuple[str, bool]:
    """يكتب حالة الشحنة فقط إن لم تكن تراجعا في التسلسل الطبيعي.

    Bosta قد تعيد إرسال حدث قديم بعد حدث أحدث (اعادة إرسال، أو تأخر في
    الشبكة). الكتابة بلا شرط كانت تُرجع `delivered` إلى `pending` بينما
    حالة الطلب تبقى `delivered` — تناقض ظاهر في اللوحة.

    الاستثناءات (فشل/فقد/تلف/إلغاء/إرجاع) تُكتب دائماً لأنها معلومات جديدة
    حتى لو سبقَت التسليم، عدا حالة واحدة: لا يمحو استثناءٌ لاحقٌ تسليماً ناجحاً.

    يعيد ``(الحالة المخزَّنة, هل تغيّرت)``.
    """
    current = order.shipping_status
    if current is None or current == internal_status:
        order.shipping_status = internal_status
        return internal_status, current != internal_status

    current_rank = SHIPMENT_PROGRESSION.get(current)
    new_rank = SHIPMENT_PROGRESSION.get(internal_status)

    if current_rank is not None and new_rank is not None:
        # كلاهما في التسلسل الطبيعي: تقدّم فقط.
        if new_rank < current_rank:
            logger.info(
                "Bosta webhook ignored - stale shipment status: order_id=%s %s -> %s",
                order.id,
                current,
                internal_status,
            )
            return current, False
        order.shipping_status = internal_status
        return internal_status, True

    if current == STATUS_DELIVERED:
        # التسليم تمّ فعلاً؛ استثناء لاحق (مثل 47 Exception) لا يمحوه.
        logger.info(
            "Bosta webhook ignored - exception after delivery: order_id=%s %s -> %s",
            order.id,
            current,
            internal_status,
        )
        return current, False

    order.shipping_status = internal_status
    return internal_status, True


def _next_order_status(order: Order, internal_status: str) -> str | None:
    """الحالة التي ينبغي أن يصبح عليها `Order.status`، أو None لعدم التغيير.

    قواعد protects دورة حياة الطلب:
      * الطلبات المُنهية (`delivered` / `cancelled`) لا تُمس.
      * تقدّم فقط: لا نرجع طلباً من `shipped` إلى `pending` إن أتت الحالة
        متأخرة أو مكررة بترتيب مختلف.
      * الإرجاع/الإلغاء/الفقد/التلف **لا** تلغي الطلب تلقائياً: ذلك قرار
        تجاري له أثر على المخزون والمبالغ المستردة، فيبقى بيد لوحة التحكم.
      * لا نلمس `payment_status`: تحصيل النقد عند المندوب يُسوّى مالياً
        يدوياً، وربطه آلياً قد يُعلّم الطلب «مدفوع» قبل التحقق.
    """
    if order.status in {"cancelled", "delivered"}:
        return None

    # تقدّم حصراً: لا نتراجع أبداً إلى ما قبل الشحن.
    if internal_status in MOVED_STATUSES and order.status in {"pending", "processing"}:
        return "shipped"

    if internal_status == STATUS_DELIVERED:
        # `shipped` أو `processing` أو `pending` كلها صالحة للانتقال إلى
        # `delivered`؛ الطلبات المُنهية استُثنيت أعلاه.
        return "delivered"

    return None


def process_bosta_event(payload: dict[str, Any]) -> ProcessResult:
    """يعالج حدث Bosta واحداً بعد التحقق من هويته.

    لا يرمي إلا `SQLAlchemyError` (تُلتقط في الـ HTTP layer وتحوّل 500)،
    لأن بقاء الأخطاء أخرى كـ return values يسمح للرد بال(descriptive) رموز
    HTTP مناسبة.
    """
    logger = current_app.logger

    provider_event_id = payload.get("_id")
    if provider_event_id is not None:
        provider_event_id = str(provider_event_id).strip() or None
    tracking = _tracking_as_text(payload.get("trackingNumber"))
    state_code = normalize_state_code(payload.get("state"))
    shipment_type = normalize_type(payload.get("type"))
    official_name = state_name(state_code)
    payload_hash = hashlib.sha256(_canonical_json(payload).encode("utf-8")).hexdigest()
    event_id = build_event_id(
        PROVIDER, provider_event_id, tracking, state_code, payload.get("timeStamp")
    )

    logger.info(
        "Bosta webhook received: event_id=%s shipment_id=%s tracking_number=%s "
        "state_code=%s state_name=%s",
        event_id[:12],
        provider_event_id,
        tracking,
        state_code,
        official_name,
    )

    # 1) منع التكرار: نقاطع السجل بالمعرّف الحتمي قبل أي تغيير على البيانات.
    existing = WebhookEvent.query.filter_by(event_id=event_id).first()
    if existing is not None:
        logger.info(
            "Bosta webhook ignored - duplicate: event_id=%s shipment_id=%s outcome=%s",
            event_id[:12],
            provider_event_id,
            existing.outcome,
        )
        return ProcessResult(
            outcome=OUTCOME_DUPLICATE,
            order_id=existing.order_id,
            internal_status=existing.internal_status,
            provider_state_code=existing.provider_state_code,
            provider_state_name=existing.provider_state_name,
            tracking_number=existing.tracking_number,
            provider_event_id=existing.provider_event_id,
        )

    internal_status = map_bosta_state(state_code, shipment_type)

    record = WebhookEvent(
        event_id=event_id,
        provider=PROVIDER,
        # نوع الشحنة من Bosta (SEND/EXCHANGE/...) هو أقرب ما يعبّر عن
        # «نوع الحدث» المتاح في حمولتها.
        event_type=shipment_type,
        payload_hash=payload_hash,
        provider_event_id=provider_event_id,
        tracking_number=tracking,
        provider_state_code=state_code,
        provider_state_name=official_name,
        internal_status=internal_status,
    )

    if internal_status is None:
        # كود غير معروف: نسجّله للاستقصاء ولا نلمس الطلب. نرجع 200 حتى لا
        # تعيد Bosta الإرسال بلا فائدة.
        record.outcome = OUTCOME_UNKNOWN_STATUS
        record.processed = True
        record.processed_at = _utcnow()
        db.session.add(record)
        db.session.commit()
        logger.warning(
            "Bosta webhook ignored - unknown state code: event_id=%s state_code=%s "
            "shipment_id=%s",
            event_id[:12],
            state_code,
            provider_event_id,
        )
        return ProcessResult(
            outcome=OUTCOME_UNKNOWN_STATUS,
            tracking_number=tracking,
            provider_event_id=provider_event_id,
            provider_state_code=state_code,
        )

    order = find_order(provider_event_id, tracking)

    if order is None:
        # لا ننشئ طلباً. نسجّل الحدث كغير معروف ونُبلغ Bosta بنجاح حتى لا
        # تكرّر الإرسال: الشحنة لن تصبح معروفة تلقائياً.
        record.outcome = OUTCOME_UNKNOWN_SHIPMENT
        record.processed = True
        record.processed_at = _utcnow()
        db.session.add(record)
        db.session.commit()
        logger.warning(
            "Bosta webhook ignored - unknown shipment: event_id=%s shipment_id=%s "
            "tracking_number=%s state_code=%s",
            event_id[:12],
            provider_event_id,
            tracking,
            state_code,
        )
        return ProcessResult(
            outcome=OUTCOME_UNKNOWN_SHIPMENT,
            internal_status=internal_status,
            tracking_number=tracking,
            provider_event_id=provider_event_id,
            provider_state_code=state_code,
            provider_state_name=official_name,
        )

    # 2) تحديث الشحنة (مع حارس ضد التراجع في التسلسل الطبيعي).
    stored_status, shipment_changed = _apply_shipment_status(
        order, internal_status, logger
    )
    # نُكمل ما ينقص من معرّفات الشحنة إن أرسلته Bosta ولم يكن مخزّناً —
    # بدون الكتابة فوق قيمة موجودة (قد تكون من لوحة التحكم).
    if provider_event_id and not order.shipping_provider_order_id:
        order.shipping_provider_order_id = provider_event_id
    if tracking and not order.tracking_number:
        order.tracking_number = tracking
    if not order.shipping_provider:
        order.shipping_provider = PROVIDER

    # 3) تحديث حالة الطلب وفق قواعد دورة الحياة.
    next_status = _next_order_status(order, internal_status)
    order_changed = False
    if next_status is not None:
        logger.info(
            "Bosta webhook advancing order status: order_id=%s %s -> %s",
            order.id,
            order.status,
            next_status,
        )
        order.status = next_status
        order_changed = True

    record.outcome = OUTCOME_PROCESSED
    record.processed = True
    record.processed_at = _utcnow()
    record.order_id = order.id
    record.internal_status = internal_status
    db.session.add(record)
    db.session.add(order)

    try:
        db.session.commit()
    except IntegrityError:
        # تعارض تزامن: طلبان متطابقان وصلوا معاً. واحد فاز بالأصل.
        db.session.rollback()
        logger.info(
            "Bosta webhook ignored - duplicate (concurrent): event_id=%s", event_id[:12]
        )
        return ProcessResult(
            outcome=OUTCOME_DUPLICATE,
            order_id=order.id,
            order_number=order.order_number,
            internal_status=internal_status,
            tracking_number=tracking,
            provider_event_id=provider_event_id,
            provider_state_code=state_code,
            provider_state_name=official_name,
        )
    except SQLAlchemyError:
        db.session.rollback()
        logger.exception(
            "Bosta webhook processing failed (database): event_id=%s order_id=%s",
            event_id[:12],
            order.id,
        )
        raise

    logger.info(
        "Bosta shipment status updated: order_id=%s shipment_id=%s tracking_number=%s "
        "shipping_status=%s shipment_status_changed=%s order_status=%s",
        order.id,
        provider_event_id,
        tracking,
        stored_status,
        shipment_changed,
        order.status,
    )
    return ProcessResult(
        outcome=OUTCOME_PROCESSED,
        order_id=order.id,
        order_number=order.order_number,
        internal_status=stored_status,
        provider_state_code=state_code,
        provider_state_name=official_name,
        tracking_number=tracking,
        provider_event_id=provider_event_id,
        order_status_changed=order_changed,
    )


def _utcnow():
    """وقت UTC الحالي بنفس مصدر `app.core.utils.utcnow`."""
    from app.core.utils import utcnow

    return utcnow()