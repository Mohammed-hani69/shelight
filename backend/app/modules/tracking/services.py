"""منطق تتبّع الرحلة — استقبال الأحداث وصلاحيات السلة التحليلية.

مبادئ:
- لا نثق بأي سعر/اسم يرسله العميل؛ تُقرأ المنتجات من قاعدة البيانات.
- كل كتابة idempotent: `event_id` يمنع تكرار الأحداث، و`convert`/`abandon`
  تحديثات شرطية آمنة ضد التسابق.
- إسقاط السلة منفصل تماماً عن السلة المعاملاتية `cart_items`.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

from flask import current_app
from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError

from app.core.utils import normalize_phone, utcnow
from app.extensions import db
from app.models import (
    AnonymousVisitor,
    CheckoutSession,
    ContactLead,
    Customer,
    JourneyCart,
    JourneyCartItem,
    Product,
    TrackingEvent,
    VisitSession,
)
from app.modules.tracking.schemas import ALLOWED_EVENTS

_CART_WRITE_EVENTS = ("add_to_cart", "remove_from_cart", "update_cart_quantity")
_CART_TOUCH_EVENTS = ("view_cart", "wishlist_add", "wishlist_remove")
_CHECKOUT_STEPS = {
    "begin_checkout": "cart",
    "add_contact_info": "contact",
    "add_shipping_info": "shipping",
    "select_shipping_method": "shipping",
    "add_payment_info": "payment",
}

# الحالات التي تُعدّ «سلة مفتوحة» قابلة للتحديث (لا المحوَّلة ولا المنتهية).
_OPEN_CART_STATUSES = ("ACTIVE", "ABANDONED", "RECOVERED")


def _clamp_time(value: datetime | None) -> datetime:
    """يزمن الحدث في نافذة معقولة: لا مستقبل، ولا أقدم من 7 أيام."""
    now = utcnow()
    if value is None:
        return now
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    if value > now:
        return now
    if value < now - timedelta(days=7):
        return now
    return value


def _to_decimal(value, default: Decimal = Decimal("0")) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return default


def _get_or_create_visitor(visitor_id: str, customer_id: int | None, meta: dict):
    """يجلب الزائر المجهول أو ينشئه، ويحدّث آخر ظهور وبيانات الجهاز."""
    visitor = db.session.get(AnonymousVisitor, visitor_id)
    now = utcnow()
    user_agent = (meta.get("userAgent") or "")[:500] or None
    if visitor is None:
        visitor = AnonymousVisitor(
            id=visitor_id,
            customer_id=customer_id,
            first_seen_at=now,
            last_seen_at=now,
            first_landing_url=meta.get("pageUrl"),
            first_referrer=meta.get("referrer"),
            first_utm_source=meta.get("utmSource"),
            first_utm_medium=meta.get("utmMedium"),
            first_utm_campaign=meta.get("utmCampaign"),
            last_device_type=meta.get("deviceType"),
            last_user_agent=user_agent,
        )
        try:
            # نقطة حفظ: إن سبقنا طلب متزامن بنفس الزائر نتبنّى سجله بدل الفشل.
            with db.session.begin_nested():
                db.session.add(visitor)
        except IntegrityError:
            visitor = db.session.get(AnonymousVisitor, visitor_id)
            if visitor is None:
                raise
            visitor.last_seen_at = now
    else:
        visitor.last_seen_at = now
        if customer_id and visitor.customer_id is None:
            visitor.customer_id = customer_id
        if meta.get("deviceType"):
            visitor.last_device_type = meta["deviceType"]
        if user_agent:
            visitor.last_user_agent = user_agent
    return visitor


def _get_or_create_session(
    visitor, session_id: str | None, customer_id: int | None, meta: dict
):
    """جلسة زيارة واحدة — تُنشأ عند أول حدث يحمل `sessionId`."""
    if not session_id:
        return None
    session = db.session.get(VisitSession, session_id)
    now = utcnow()
    if session is None:
        session = VisitSession(
            id=session_id,
            visitor_id=visitor.id,
            customer_id=customer_id,
            started_at=now,
            last_activity_at=now,
            entry_url=meta.get("pageUrl"),
            referrer=meta.get("referrer"),
            device_type=meta.get("deviceType"),
        )
        try:
            # نقطة حفظ: جلسة سبقها طلب متزامن لا تُسبب خطأ تفرّد.
            with db.session.begin_nested():
                db.session.add(session)
            visitor.sessions_count = (visitor.sessions_count or 0) + 1
        except IntegrityError:
            session = db.session.get(VisitSession, session_id)
            if session is None:
                raise
            session.last_activity_at = now
    else:
        session.last_activity_at = now
    return session


def ingest_events(events: list[dict], visitor_id: str | None, customer_id: int | None, meta: dict) -> int:
    """يستقبل دفعة أحداث: تحقّق، منع تكرار، تحديث الجلسات وإسقاط السلة."""
    now = utcnow()
    incoming_ids = [event["eventId"] for event in events]
    existing: set[str] = set()
    if incoming_ids:
        existing = set(
            db.session.execute(
                select(TrackingEvent.event_id).where(TrackingEvent.event_id.in_(incoming_ids))
            )
            .scalars()
            .all()
        )

    visitor = None
    if visitor_id:
        visitor = _get_or_create_visitor(visitor_id, customer_id, meta)

    accepted = 0
    for raw in events:
        event_id = raw["eventId"]
        name = raw["name"]
        if event_id in existing or name not in ALLOWED_EVENTS:
            continue
        existing.add(event_id)

        properties = raw.get("properties") or {}
        event = TrackingEvent(
            event_id=event_id,
            name=name,
            visitor_id=visitor_id,
            session_id=raw.get("sessionId"),
            customer_id=customer_id,
            event_timestamp=_clamp_time(raw.get("timestamp")),
            received_at=now,
            page_url=raw.get("pageUrl"),
            referrer=raw.get("referrer"),
            path=raw.get("path"),
            properties=properties,
        )
        try:
            # نقطة حفظ: إن أدرج طلب متزامن نفس الحدث نعتبره مُستلَماً ونتخطاه.
            with db.session.begin_nested():
                db.session.add(event)
        except IntegrityError:
            continue

        if visitor is not None:
            visitor.events_count = (visitor.events_count or 0) + 1
            session = _get_or_create_session(
                visitor,
                raw.get("sessionId"),
                customer_id,
                {**meta, "pageUrl": raw.get("pageUrl"), "referrer": raw.get("referrer")},
            )
            if session is not None:
                session.event_count = (session.event_count or 0) + 1
                session.last_activity_at = now
                if name == "page_view":
                    session.page_views = (session.page_views or 0) + 1
                if session.event_count > 1:
                    session.is_bounce = False

        _apply_projection(name, properties, visitor_id, customer_id, raw.get("sessionId"))
        accepted += 1

    db.session.commit()
    return accepted


# ---------------------------------------------------------------------------
# إسقاط السلة (Cart Projection)
# ---------------------------------------------------------------------------


def _open_cart(visitor_id: str | None) -> JourneyCart | None:
    if not visitor_id:
        return None
    return (
        db.session.execute(
            select(JourneyCart)
            .where(
                JourneyCart.visitor_id == visitor_id,
                JourneyCart.status.in_(_OPEN_CART_STATUSES),
            )
            .order_by(JourneyCart.last_activity_at.desc())
        )
        .scalars()
        .first()
    )


def _cart_for_write(
    visitor_id: str, customer_id: int | None, session_id: str | None
) -> JourneyCart:
    """يجلب السلة المفتوحة أو ينشئها، ويستعيدها إن كانت متروكة."""
    now = utcnow()
    cart = _open_cart(visitor_id)
    if cart is None:
        cart = JourneyCart(
            visitor_id=visitor_id,
            session_id=session_id,
            customer_id=customer_id,
            status="ACTIVE",
            currency=current_app.config["TRACKING_CURRENCY"],
            last_activity_at=now,
        )
        db.session.add(cart)
    else:
        if cart.status == "ABANDONED":
            cart.status = "RECOVERED"
            cart.recovered_at = now
        cart.customer_id = cart.customer_id or customer_id
        cart.session_id = session_id or cart.session_id
        cart.last_activity_at = now
    return cart


def _recompute_cart(cart: JourneyCart) -> None:
    active = [i for i in cart.items if i.removed_at is None and i.quantity > 0]
    cart.items_count = sum(i.quantity for i in active)
    cart.subtotal = sum(
        (_to_decimal(i.unit_price) * i.quantity for i in active), Decimal("0")
    )
    cart.total = cart.subtotal


def _find_line(cart: JourneyCart, product_id: int | None) -> JourneyCartItem | None:
    for item in cart.items:
        if item.removed_at is None and item.product_id == product_id:
            return item
    return None


def _project_add(properties: dict, visitor_id: str, customer_id: int | None, session_id: str | None) -> None:
    product = None
    if properties.get("productId") is not None:
        try:
            product = db.session.get(Product, int(properties["productId"]))
        except (TypeError, ValueError):
            product = None
    quantity = max(1, int(properties.get("quantity") or 1))
    now = utcnow()
    cart = _cart_for_write(visitor_id, customer_id, session_id)
    if cart.first_item_added_at is None:
        cart.first_item_added_at = now

    product_id = product.id if product else None
    line = _find_line(cart, product_id)
    if line is not None:
        line.quantity += quantity
    else:
        cart.items.append(
            JourneyCartItem(
                product_id=product_id,
                product_name=product.name_en if product else str(properties.get("name") or ""),
                product_slug=product.slug if product else str(properties.get("slug") or ""),
                unit_price=product.price if product else _to_decimal(properties.get("price")),
                quantity=quantity,
                added_at=now,
            )
        )
    _recompute_cart(cart)


def _project_update(properties: dict, visitor_id: str, customer_id: int | None, session_id: str | None) -> None:
    cart = _open_cart(visitor_id)
    if cart is None:
        return
    product_id = properties.get("productId")
    try:
        product_id = int(product_id) if product_id is not None else None
    except (TypeError, ValueError):
        product_id = None
    line = _find_line(cart, product_id)
    if line is None:
        return
    quantity = int(properties.get("quantity") or 0)
    if quantity <= 0:
        line.removed_at = utcnow()
    else:
        line.quantity = quantity
    cart.last_activity_at = utcnow()
    _recompute_cart(cart)


def _project_remove(properties: dict, visitor_id: str, customer_id: int | None, session_id: str | None) -> None:
    cart = _open_cart(visitor_id)
    if cart is None:
        return
    product_id = properties.get("productId")
    try:
        product_id = int(product_id) if product_id is not None else None
    except (TypeError, ValueError):
        product_id = None
    line = _find_line(cart, product_id)
    if line is not None:
        line.removed_at = utcnow()
    cart.last_activity_at = utcnow()
    _recompute_cart(cart)


def _touch_open_cart(visitor_id: str | None, customer_id: int | None, session_id: str | None) -> None:
    cart = _open_cart(visitor_id)
    if cart is None:
        return
    now = utcnow()
    if cart.status == "ABANDONED":
        cart.status = "RECOVERED"
        cart.recovered_at = now
    cart.customer_id = cart.customer_id or customer_id
    cart.last_activity_at = now


def _project_checkout(name: str, properties: dict, visitor_id: str | None, customer_id: int | None, session_id: str | None) -> None:
    key = properties.get("checkoutKey") or session_id
    if not key:
        return
    key = str(key)[:64]
    now = utcnow()
    checkout = db.session.execute(
        select(CheckoutSession).where(CheckoutSession.checkout_key == key)
    ).scalars().first()
    if checkout is None:
        checkout = CheckoutSession(
            checkout_key=key,
            visitor_id=visitor_id,
            session_id=session_id,
            customer_id=customer_id,
            status="IN_PROGRESS",
            step="cart",
            started_at=now,
            last_activity_at=now,
        )
        db.session.add(checkout)
    checkout.last_activity_at = now
    checkout.customer_id = checkout.customer_id or customer_id
    checkout.step = _CHECKOUT_STEPS.get(name, checkout.step)
    if name == "checkout_error":
        checkout.status = "FAILED"
    for prop_key, column in (
        ("email", "email"),
        ("couponCode", "coupon_code"),
        ("paymentMethod", "payment_method"),
    ):
        value = properties.get(prop_key)
        if value:
            setattr(checkout, column, str(value)[:254])
    _touch_open_cart(visitor_id, customer_id, session_id)


def _apply_projection(
    name: str,
    properties: dict,
    visitor_id: str | None,
    customer_id: int | None,
    session_id: str | None,
) -> None:
    if not visitor_id:
        return
    if name == "add_to_cart":
        _project_add(properties, visitor_id, customer_id, session_id)
    elif name == "update_cart_quantity":
        _project_update(properties, visitor_id, customer_id, session_id)
    elif name == "remove_from_cart":
        _project_remove(properties, visitor_id, customer_id, session_id)
    elif name in _CART_TOUCH_EVENTS:
        _touch_open_cart(visitor_id, customer_id, session_id)
    elif name in _CHECKOUT_STEPS or name == "checkout_error":
        _project_checkout(name, properties, visitor_id, customer_id, session_id)


# ---------------------------------------------------------------------------
# التحويل والربط واكتشاف الترك
# ---------------------------------------------------------------------------


def link_visitor_to_customer(visitor_id: str | None, customer_id: int) -> bool:
    """يربط الزائر بحساب العميل ويرحّل كل تاريخه المجهول إلى اسمه."""
    if not visitor_id:
        return False
    visitor = db.session.get(AnonymousVisitor, visitor_id)
    if visitor is None or not customer_id:
        return False
    if visitor.customer_id != customer_id:
        visitor.customer_id = customer_id
        for model in (TrackingEvent, VisitSession, JourneyCart, CheckoutSession, ContactLead):
            db.session.execute(
                update(model)
                .where(model.visitor_id == visitor_id, model.customer_id.is_(None))
                .values(customer_id=customer_id)
            )
        db.session.commit()
    return True


# ---------------------------------------------------------------------------
# التقاط هوية العميل المحتمل (Lead Capture) تدريجياً — بلا بريد إلكتروني
# ---------------------------------------------------------------------------


def _find_customer_id_by_phone(normalized: str | None) -> int | None:
    """يحلّ الهوية: هل رقم الهاتف الموحّد يخص عميلاً مسجَّلاً بالفعل؟"""
    if not normalized:
        return None
    return db.session.execute(
        select(Customer.id).where(Customer.normalized_phone == normalized)
    ).scalar_one_or_none()


def _clean(value) -> str | None:
    """يطبّع نصاً اختيارياً؛ الفراغ يصبح None حتى لا يمحو قيمة محفوظة."""
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def save_checkout_lead(
    data: dict,
    visitor_id: str | None,
    customer_id: int | None,
    meta: dict,
) -> ContactLead | None:
    """يحفظ/يحدّث هوية العميل المحتمل تدريجياً أثناء الدفع.

    - كل الحقول اختيارية؛ الحفظ الجزئي لا يمحو الحقول المحفوظة سابقاً.
    - الهاتف الأساسي يُوحَّد ويُستخدم لمنع التكرار؛ الهاتف الثاني يُسقط
      إذا ساوى الأساسي بعد التوحيد.
    - ضيف بلا حساب يبقى مربوطاً بـ `visitor_id` + الهاتف الموحّد.
    """
    full_name = _clean(data.get("fullName"))
    raw_primary = _clean(data.get("primaryPhone"))
    raw_secondary = _clean(data.get("secondaryPhone"))
    address = _clean(data.get("address"))
    city = _clean(data.get("city"))
    governorate = _clean(data.get("governorate"))
    checkout_key = _clean(data.get("checkoutKey"))
    session_id = _clean(data.get("sessionId"))

    # لا ننشئ سجلاً فارغاً بلا أي بيانات هوية.
    if not any((full_name, raw_primary, address, city, governorate)):
        return None

    normalized = normalize_phone(raw_primary) or None
    secondary_normalized = normalize_phone(raw_secondary) or None

    now = utcnow()

    def _find_by_context() -> ContactLead | None:
        if checkout_key:
            found = db.session.execute(
                select(ContactLead)
                .where(ContactLead.checkout_key == checkout_key)
                .order_by(ContactLead.last_activity_at.desc())
            ).scalars().first()
            if found is not None:
                return found
        if visitor_id:
            return db.session.execute(
                select(ContactLead)
                .where(ContactLead.visitor_id == visitor_id)
                .order_by(ContactLead.last_activity_at.desc())
            ).scalars().first()
        return None

    def _resolve_target() -> ContactLead:
        """يحلّ سجل الهوية: الهاتف أقوى مفتاح، مع دمج السجل المكرر لنفس السياق."""
        phone_lead = None
        if normalized:
            phone_lead = db.session.execute(
                select(ContactLead).where(ContactLead.normalized_phone == normalized)
            ).scalars().first()
        context_lead = _find_by_context()

        if phone_lead is not None:
            # سجل السياق المكرر (بلا هاتف) يُدمج في سجل الهاتف ثم يُحذف،
            # منعاً لتعارض فريد (visitor_id, checkout_key) عند إعادة الربط.
            if context_lead is not None and context_lead.id != phone_lead.id:
                for field in (
                    "full_name",
                    "secondary_phone",
                    "address",
                    "city",
                    "governorate",
                ):
                    if not getattr(phone_lead, field) and getattr(context_lead, field):
                        setattr(phone_lead, field, getattr(context_lead, field))
                db.session.delete(context_lead)
                db.session.flush()
            return phone_lead

        if context_lead is not None:
            return context_lead

        created = ContactLead(
            first_seen_at=now,
            last_activity_at=now,
            status="PARTIAL",
            recovery_status="NONE",
            contact_eligible=True,
        )
        db.session.add(created)
        return created

    def _apply(target: ContactLead) -> int | None:
        """يدمج الحقول غير الفارغة ويعيد معرّف العميل المحلول."""
        if full_name:
            target.full_name = full_name
        if raw_primary:
            target.primary_phone = raw_primary
        if normalized:
            target.normalized_phone = normalized
        if raw_secondary:
            # هاتف ثانٍ مساوٍ للأساسي لا معنى له — يُهمل.
            target.secondary_phone = (
                None if secondary_normalized == normalized else raw_secondary
            )
        if address:
            target.address = address
        if city:
            target.city = city
        if governorate:
            target.governorate = governorate
        if checkout_key:
            target.checkout_key = checkout_key
        if session_id:
            target.session_id = session_id
        if visitor_id:
            target.visitor_id = visitor_id

        resolved = customer_id or target.customer_id or _find_customer_id_by_phone(normalized)
        if resolved:
            target.customer_id = resolved

        if target.status != "CONVERTED":
            target.status = (
                "COMPLETE"
                if (target.full_name and target.normalized_phone and target.address)
                else "PARTIAL"
            )
        target.last_activity_at = now
        return resolved

    def _sync_visitor(resolved: int | None) -> None:
        if visitor_id:
            visitor = _get_or_create_visitor(visitor_id, resolved, meta)
            _get_or_create_session(visitor, session_id, resolved, meta)

    lead = _resolve_target()
    try:
        resolved_customer = _apply(lead)
        _sync_visitor(resolved_customer)
        db.session.commit()
    except IntegrityError:
        # تسابق بين طلبَي حفظ متزامنين → نعيد الحل بعد التراجع بدل الفشل.
        db.session.rollback()
        lead = _resolve_target()
        resolved_customer = _apply(lead)
        _sync_visitor(resolved_customer)
        db.session.commit()
    return lead


def record_purchase(
    order,
    visitor_id: str | None = None,
    session_id: str | None = None,
    checkout_key: str | None = None,
) -> None:
    """يسجّل عملية شراء موثوقة من الخادم ويحوّل السلة وجلسة الدفع.

    الإجماليات تُؤخذ من الطلب المُتحقَّق منه، لا من الواجهة. `event_id`
    مشتق من رقم الطلب فيمنع التكرار عند إعادة المحاولة.
    """
    if not current_app.config["TRACKING_ENABLED"]:
        return
    now = utcnow()
    event_id = f"purchase-{order.order_number}"
    exists = db.session.execute(
        select(TrackingEvent.id).where(TrackingEvent.event_id == event_id)
    ).scalar_one_or_none()
    if exists is None:
        db.session.add(
            TrackingEvent(
                event_id=event_id,
                name="purchase",
                visitor_id=visitor_id,
                session_id=session_id,
                customer_id=order.customer_id,
                event_timestamp=now,
                received_at=now,
                properties={
                    "orderId": str(order.id),
                    "orderNumber": order.order_number,
                    "itemsCount": sum(item.quantity for item in order.items),
                    "subtotal": float(order.subtotal),
                    "shipping": float(order.shipping_cost),
                    "discount": float(order.discount_amount),
                    "total": float(order.total),
                    "currency": current_app.config["TRACKING_CURRENCY"],
                    "paymentMethod": order.payment_method,
                    "couponCode": order.coupon_code,
                },
            )
        )

    if visitor_id:
        cart = _open_cart(visitor_id)
        if cart is not None:
            cart.status = "CONVERTED"
            cart.converted_at = now
            cart.converted_order_id = order.id
            cart.customer_id = cart.customer_id or order.customer_id
            cart.last_activity_at = now

    key = (checkout_key or f"order-{order.order_number}")[:64]
    checkout = db.session.execute(
        select(CheckoutSession).where(CheckoutSession.checkout_key == key)
    ).scalars().first()
    if checkout is None:
        checkout = CheckoutSession(
            checkout_key=key,
            visitor_id=visitor_id,
            session_id=session_id,
            customer_id=order.customer_id,
            status="COMPLETED",
            step="completed",
            started_at=now,
            last_activity_at=now,
        )
        db.session.add(checkout)
    checkout.status = "COMPLETED"
    checkout.step = "completed"
    checkout.order_id = order.id
    checkout.completed_at = now
    checkout.last_activity_at = now
    checkout.customer_id = order.customer_id or checkout.customer_id
    checkout.email = checkout.email or order.guest_email
    checkout.phone = checkout.phone or order.shipping_phone
    checkout.payment_method = order.payment_method
    checkout.coupon_code = order.coupon_code
    checkout.subtotal = order.subtotal
    checkout.discount = order.discount_amount
    checkout.shipping = order.shipping_cost
    checkout.total = order.total
    checkout.items_count = sum(item.quantity for item in order.items)

    # هوية العميل المحتمل المرتبطة بهذه الرحلة تتحوّل إلى «محوّلة».
    lead_conditions = []
    if visitor_id:
        lead_conditions.append(ContactLead.visitor_id == visitor_id)
    if checkout_key:
        lead_conditions.append(ContactLead.checkout_key == checkout_key)
    if lead_conditions:
        values = {"status": "CONVERTED", "last_activity_at": now}
        if order.customer_id:
            values["customer_id"] = order.customer_id
        db.session.execute(
            update(ContactLead).where(or_(*lead_conditions)).values(**values)
        )

    db.session.commit()


def detect_abandoned_carts(threshold_minutes: int | None = None) -> int:
    """يعلّم السلال التي مرّت بلا نشاط حدّ الترك — تحديث شرطي idempotent."""
    if not current_app.config["TRACKING_ENABLED"]:
        return 0
    minutes = int(
        threshold_minutes
        if threshold_minutes is not None
        else current_app.config["ABANDONED_CART_THRESHOLD_MINUTES"]
    )
    now = utcnow()
    cutoff = now - timedelta(minutes=minutes)
    result = db.session.execute(
        update(JourneyCart)
        .where(
            JourneyCart.status == "ACTIVE",
            JourneyCart.items_count > 0,
            JourneyCart.last_activity_at < cutoff,
        )
        .values(status="ABANDONED", abandoned_at=now)
    )
    db.session.commit()
    return result.rowcount or 0
