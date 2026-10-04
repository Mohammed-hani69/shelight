"""استعلامات تحليلات الرحلة — كلها للقراءة فقط وتُستدعى للمدراء."""
from __future__ import annotations

from datetime import timedelta

from sqlalchemy import distinct, func, or_, select

from app.core.utils import utcnow
from app.extensions import db
from app.models import (
    AnonymousVisitor,
    CheckoutSession,
    ContactLead,
    Customer,
    JourneyCart,
    Order,
    TrackingEvent,
    VisitSession,
)
from app.modules.analytics.schemas import (
    cart_payload,
    checkout_payload,
    event_payload,
    visitor_payload,
)

# مراحل المسار (Funnel) بالترتيب — القياس على الجلسات المميّزة.
FUNNEL_STEPS = (
    ("page_view", "زيارة"),
    ("product_view", "مشاهدة منتج"),
    ("add_to_cart", "إضافة للسلة"),
    ("begin_checkout", "بدء الدفع"),
    ("purchase", "شراء"),
)


def _since(days: int):
    return utcnow() - timedelta(days=max(1, days))


def _scalar(stmt):
    return db.session.execute(stmt).scalar_one()


def _count_events(since, name: str | None = None) -> int:
    stmt = select(func.count(TrackingEvent.id)).where(TrackingEvent.event_timestamp >= since)
    if name:
        stmt = stmt.where(TrackingEvent.name == name)
    return _scalar(stmt)


def _count_distinct(column, since, name: str | None = None) -> int:
    stmt = select(func.count(distinct(column))).where(TrackingEvent.event_timestamp >= since)
    if name:
        stmt = stmt.where(TrackingEvent.name == name)
    return _scalar(stmt)


def _customer_email(customer_id: int | None) -> str | None:
    if not customer_id:
        return None
    customer = db.session.get(Customer, customer_id)
    return customer.email if customer else None


def _latest_leads_by_visitor(visitor_ids: list[str]) -> dict[str, ContactLead]:
    """أحدث عميل محتمل لكل زائر — استعلام واحد بدل استعلام لكل سلة."""
    if not visitor_ids:
        return {}
    rows = (
        db.session.execute(
            select(ContactLead)
            .where(ContactLead.visitor_id.in_(visitor_ids))
            .order_by(ContactLead.last_activity_at.desc())
        )
        .scalars()
        .all()
    )
    leads: dict[str, ContactLead] = {}
    for lead in rows:
        leads.setdefault(lead.visitor_id, lead)
    return leads


def _latest_steps_by_visitor(visitor_ids: list[str]) -> dict[str, str]:
    """آخر خطوة دفع وصل إليها كل زائر."""
    if not visitor_ids:
        return {}
    rows = (
        db.session.execute(
            select(CheckoutSession)
            .where(CheckoutSession.visitor_id.in_(visitor_ids))
            .order_by(CheckoutSession.last_activity_at.desc())
        )
        .scalars()
        .all()
    )
    steps: dict[str, str] = {}
    for checkout in rows:
        steps.setdefault(checkout.visitor_id, checkout.step)
    return steps


def overview(days: int = 30) -> dict:
    """بطاقة نظرة عامة: زوّار، جلسات، تفاعل، تحويل، سلال متروكة."""
    since = _since(days)

    sessions = _count_distinct(TrackingEvent.session_id, since)
    visitors = _count_distinct(TrackingEvent.visitor_id, since)
    purchases = _count_events(since, "purchase")
    page_views = _count_events(since, "page_view")
    product_views = _count_events(since, "product_view")
    adds = _count_events(since, "add_to_cart")
    checkouts = _count_events(since, "begin_checkout")
    total_events = _count_events(since)

    bounced = _scalar(
        select(func.count(VisitSession.id)).where(
            VisitSession.last_activity_at >= since, VisitSession.is_bounce.is_(True)
        )
    )
    total_sessions = _scalar(
        select(func.count(VisitSession.id)).where(VisitSession.last_activity_at >= since)
    )

    abandoned_count = _scalar(
        select(func.count(JourneyCart.id)).where(
            JourneyCart.status == "ABANDONED", JourneyCart.abandoned_at >= since
        )
    )
    abandoned_value = _scalar(
        select(func.coalesce(func.sum(JourneyCart.subtotal), 0)).where(
            JourneyCart.status == "ABANDONED", JourneyCart.abandoned_at >= since
        )
    )
    recovered_count = _scalar(
        select(func.count(JourneyCart.id)).where(
            JourneyCart.status.in_(("RECOVERED", "CONVERTED")),
            JourneyCart.recovered_at >= since,
        )
    )
    converted_count = _scalar(
        select(func.count(JourneyCart.id)).where(
            JourneyCart.status == "CONVERTED", JourneyCart.converted_at >= since
        )
    )
    revenue = _scalar(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.created_at >= since, Order.status != "cancelled"
        )
    )
    leads = _scalar(
        select(func.count(ContactLead.id)).where(ContactLead.last_activity_at >= since)
    )

    def _rate(part: int, whole: int) -> float:
        return round((part / whole) * 100, 1) if whole else 0.0

    return {
        "rangeDays": days,
        "visitors": visitors,
        "sessions": sessions,
        "pageViews": page_views,
        "productViews": product_views,
        "addToCarts": adds,
        "checkouts": checkouts,
        "purchases": purchases,
        "revenue": float(revenue),
        "conversionRate": _rate(purchases, sessions),
        "bounceRate": _rate(bounced, total_sessions),
        "avgEventsPerSession": round(total_events / sessions, 2) if sessions else 0.0,
        "abandonedCarts": abandoned_count,
        "abandonedValue": float(abandoned_value),
        "recoveredCarts": recovered_count,
        "convertedCarts": converted_count,
        "leads": leads,
    }


def funnel(days: int = 30) -> dict:
    """مسار التحويل خطوة بخطوة مع نسبة كل مرحلة إلى الجلسات."""
    since = _since(days)
    steps = []
    top = 0
    for name, label in FUNNEL_STEPS:
        count = _count_distinct(TrackingEvent.session_id, since, name)
        if not steps:
            top = count
        steps.append(
            {
                "name": name,
                "label": label,
                "count": count,
                "rate": round((count / top) * 100, 1) if top else 0.0,
            }
        )
    return {"rangeDays": days, "steps": steps}


def abandoned_carts(days: int = 30, limit: int = 50) -> list[dict]:
    """السلال المتروكة (وأيضاً المستعادة/المحوَّلة) خلال المدة."""
    since = _since(days)
    carts = (
        db.session.execute(
            select(JourneyCart)
            .where(
                JourneyCart.last_activity_at >= since,
                JourneyCart.status.in_(("ABANDONED", "RECOVERED", "CONVERTED")),
            )
            .order_by(JourneyCart.last_activity_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    visitor_ids = [cart.visitor_id for cart in carts if cart.visitor_id]
    leads = _latest_leads_by_visitor(visitor_ids)
    steps = _latest_steps_by_visitor(visitor_ids)
    return [
        cart_payload(cart, _customer_email(cart.customer_id), leads.get(cart.visitor_id), steps.get(cart.visitor_id))
        for cart in carts
    ]


def list_visitors(days: int = 30, limit: int = 50) -> list[dict]:
    """الزوار النشطون خلال المدة مع عدد أحداثهم الفعلي."""
    since = _since(days)
    visitors = (
        db.session.execute(
            select(AnonymousVisitor)
            .where(AnonymousVisitor.last_seen_at >= since)
            .order_by(AnonymousVisitor.last_seen_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    if not visitors:
        return []
    visitor_ids = [visitor.id for visitor in visitors]
    counts = dict(
        db.session.execute(
            select(TrackingEvent.visitor_id, func.count(TrackingEvent.id))
            .where(TrackingEvent.visitor_id.in_(visitor_ids))
            .group_by(TrackingEvent.visitor_id)
        ).all()
    )
    leads = _latest_leads_by_visitor(visitor_ids)
    return [
        visitor_payload(
            visitor,
            _customer_email(visitor.customer_id),
            counts.get(visitor.id, 0),
            leads.get(visitor.id),
        )
        for visitor in visitors
    ]


def _events_for(conditions, limit: int) -> list[dict]:
    events = (
        db.session.execute(
            select(TrackingEvent)
            .where(or_(*conditions))
            .order_by(TrackingEvent.event_timestamp.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return [event_payload(event) for event in events]


def customer_timeline(customer_id: int, limit: int = 200) -> dict:
    """الخط الزمني الكامل لعميل — أحداثه (بما فيها المجهولة قبل الربط) وسلاله."""
    customer = db.session.get(Customer, customer_id)
    if customer is None:
        return {"customer": None, "events": [], "carts": [], "checkoutSessions": []}

    visitor_ids = [
        row[0]
        for row in db.session.execute(
            select(AnonymousVisitor.id).where(AnonymousVisitor.customer_id == customer_id)
        ).all()
    ]
    event_conditions = [TrackingEvent.customer_id == customer_id]
    cart_conditions = [JourneyCart.customer_id == customer_id]
    checkout_conditions = [CheckoutSession.customer_id == customer_id]
    if visitor_ids:
        event_conditions.append(TrackingEvent.visitor_id.in_(visitor_ids))
        cart_conditions.append(JourneyCart.visitor_id.in_(visitor_ids))
        checkout_conditions.append(CheckoutSession.visitor_id.in_(visitor_ids))

    carts = (
        db.session.execute(
            select(JourneyCart)
            .where(or_(*cart_conditions))
            .order_by(JourneyCart.last_activity_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    checkouts = (
        db.session.execute(
            select(CheckoutSession)
            .where(or_(*checkout_conditions))
            .order_by(CheckoutSession.last_activity_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    lead_rows = (
        db.session.execute(
            select(ContactLead)
            .where(
                or_(
                    ContactLead.customer_id == customer_id,
                    ContactLead.visitor_id.in_(visitor_ids),
                )
            )
            .order_by(ContactLead.last_activity_at.desc())
        )
        .scalars()
        .all()
    )
    leads_by_visitor: dict[str, ContactLead] = {}
    for lead in lead_rows:
        if lead.visitor_id:
            leads_by_visitor.setdefault(lead.visitor_id, lead)
    fallback_lead = lead_rows[0] if lead_rows else None

    return {
        "customer": {
            "id": customer.id,
            "email": customer.email,
            "phone": customer.phone,
            "firstName": customer.first_name,
            "lastName": customer.last_name,
        },
        "events": _events_for(event_conditions, limit),
        "carts": [
            cart_payload(cart, customer.email, leads_by_visitor.get(cart.visitor_id) or fallback_lead)
            for cart in carts
        ],
        "checkoutSessions": [checkout_payload(checkout) for checkout in checkouts],
    }


def visitor_timeline(visitor_id: str, limit: int = 200) -> dict:
    """الخط الزمني لزائر مجهول (أو مرتبط بعميل)."""
    visitor = db.session.get(AnonymousVisitor, visitor_id)
    if visitor is None:
        return {"visitor": None, "events": [], "carts": [], "checkoutSessions": []}
    carts = (
        db.session.execute(
            select(JourneyCart)
            .where(JourneyCart.visitor_id == visitor_id)
            .order_by(JourneyCart.last_activity_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    checkouts = (
        db.session.execute(
            select(CheckoutSession)
            .where(CheckoutSession.visitor_id == visitor_id)
            .order_by(CheckoutSession.last_activity_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    lead = (
        db.session.execute(
            select(ContactLead)
            .where(ContactLead.visitor_id == visitor_id)
            .order_by(ContactLead.last_activity_at.desc())
        )
        .scalars()
        .first()
    )
    return {
        "visitor": visitor_payload(visitor, _customer_email(visitor.customer_id), lead=lead),
        "events": _events_for([TrackingEvent.visitor_id == visitor_id], limit),
        "carts": [
            cart_payload(cart, _customer_email(cart.customer_id), lead) for cart in carts
        ],
        "checkoutSessions": [checkout_payload(checkout) for checkout in checkouts],
    }
