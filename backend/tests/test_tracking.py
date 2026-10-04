"""اختبارات تتبّع الرحلة: استقبال الأحداث، إسقاط السلة، الترك، الشراء، الربط."""
from __future__ import annotations

from datetime import timedelta

from app.core.utils import utcnow
from app.extensions import db
from app.models import AnonymousVisitor, JourneyCart, TrackingEvent, VisitSession
from tests.conftest import product_id

VISITOR = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
SESSION = "11111111-1111-1111-1111-111111111111"


def _event(name: str, event_id: str, **properties) -> dict:
    return {
        "eventId": event_id,
        "name": name,
        "sessionId": SESSION,
        "properties": properties,
    }


def _ingest(client, events, visitor=VISITOR):
    return client.post(
        "/api/v1/tracking/events",
        json={"events": events},
        headers={"X-Anonymous-Id": visitor},
    )


def test_ingest_creates_visitor_session_and_event(client, app):
    response = _ingest(client, [_event("page_view", "evt-1"), _event("product_view", "evt-2")])
    assert response.status_code == 200
    assert response.get_json()["data"]["accepted"] == 2

    with app.app_context():
        visitor = db.session.get(AnonymousVisitor, VISITOR)
        assert visitor is not None
        assert visitor.events_count == 2
        assert visitor.sessions_count == 1
        session = db.session.get(VisitSession, SESSION)
        assert session.event_count == 2
        assert session.page_views == 1
        assert session.is_bounce is False


def test_ingest_is_idempotent_by_event_id(client, app):
    events = [_event("page_view", "dup-1")]
    assert _ingest(client, events).get_json()["data"]["accepted"] == 1
    # إعادة نفس الدفعة لا تُنشئ حدثاً ثانياً
    assert _ingest(client, events).get_json()["data"]["accepted"] == 0
    with app.app_context():
        assert TrackingEvent.query.filter_by(event_id="dup-1").count() == 1


def test_ingest_accepts_anonymous_id_in_body(client, app):
    # بديل الترويسة: الواجهة قد ترسل anonymousId داخل جسم الدفعة (keepalive).
    response = client.post(
        "/api/v1/tracking/events",
        json={"events": [_event("page_view", "body-1")], "anonymousId": VISITOR},
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["accepted"] == 1
    with app.app_context():
        assert db.session.get(AnonymousVisitor, VISITOR) is not None


def test_unknown_event_name_is_ignored(client):
    response = _ingest(client, [_event("totally_made_up", "evt-bad")])
    assert response.status_code == 200
    assert response.get_json()["data"]["accepted"] == 0


def test_cart_projection_uses_server_price(client, app):
    pid = product_id(client, "luminous-glow-serum")  # 890
    _ingest(
        client,
        [_event("add_to_cart", "cart-1", productId=pid, quantity=2, price=1)],
    )
    with app.app_context():
        cart = JourneyCart.query.filter_by(visitor_id=VISITOR).first()
        assert cart is not None
        assert cart.items_count == 2
        # السعر من قاعدة البيانات لا من حمولة العميل
        assert float(cart.subtotal) == 1780.0
        assert float(cart.items[0].unit_price) == 890.0


def test_cart_update_and_remove(client, app):
    pid = product_id(client, "dew-drop-toner")
    _ingest(client, [_event("add_to_cart", "u-1", productId=pid, quantity=1)])
    _ingest(client, [_event("update_cart_quantity", "u-2", productId=pid, quantity=3)])
    with app.app_context():
        cart = JourneyCart.query.filter_by(visitor_id=VISITOR).first()
        assert cart.items_count == 3

    _ingest(client, [_event("remove_from_cart", "u-3", productId=pid)])
    with app.app_context():
        cart = JourneyCart.query.filter_by(visitor_id=VISITOR).first()
        assert cart.items_count == 0


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def test_abandonment_is_threshold_based_and_idempotent(client, app):
    pid = product_id(client, "luminous-glow-serum")
    _ingest(client, [_event("add_to_cart", "ab-1", productId=pid, quantity=1)])
    with app.app_context():
        cart = JourneyCart.query.filter_by(visitor_id=VISITOR).first()
        cart.last_activity_at = utcnow() - timedelta(minutes=120)
        db.session.commit()

    headers = _admin_headers(client)
    first = client.post("/api/v1/admin/analytics/run-abandonment", headers=headers)
    assert first.get_json()["data"]["abandoned"] == 1
    # إعادة تشغيل الفحص لا تعيد وسم نفس السلة
    second = client.post("/api/v1/admin/analytics/run-abandonment", headers=headers)
    assert second.get_json()["data"]["abandoned"] == 0
    with app.app_context():
        assert JourneyCart.query.filter_by(visitor_id=VISITOR).first().status == "ABANDONED"


def test_abandoned_cart_recovered_on_new_activity(client, app):
    pid = product_id(client, "luminous-glow-serum")
    _ingest(client, [_event("add_to_cart", "rc-1", productId=pid, quantity=1)])
    with app.app_context():
        cart = JourneyCart.query.filter_by(visitor_id=VISITOR).first()
        cart.status = "ABANDONED"
        cart.abandoned_at = utcnow()
        db.session.commit()

    _ingest(client, [_event("add_to_cart", "rc-2", productId=pid, quantity=1)])
    with app.app_context():
        cart = JourneyCart.query.filter_by(visitor_id=VISITOR).first()
        assert cart.status == "RECOVERED"
        assert cart.recovered_at is not None


def test_checkout_records_trusted_purchase_and_converts_cart(client, app):
    pid = product_id(client, "luminous-glow-serum")
    _ingest(client, [_event("add_to_cart", "pu-1", productId=pid, quantity=1)])
    payload = {
        "shipping": {
            "firstName": "Guest",
            "lastName": "User",
            "phone": "01000000000",
            "address": "12 Nile Street",
            "city": "Cairo",
            "governorate": "Cairo",
        },
        "paymentMethod": "cod",
        "items": [{"productId": pid, "quantity": 1}],
        "sessionId": SESSION,
        "checkoutKey": "chk-1",
    }
    response = client.post(
        "/api/v1/orders/checkout",
        json=payload,
        headers={"X-Anonymous-Id": VISITOR},
    )
    assert response.status_code == 201

    with app.app_context():
        purchase = TrackingEvent.query.filter_by(name="purchase").first()
        assert purchase is not None
        # الإجمالي الموثوق من الطلب (890 + 60 شحن) لا من الواجهة
        assert purchase.properties["total"] == 950.0
        cart = JourneyCart.query.filter_by(visitor_id=VISITOR).first()
        assert cart.status == "CONVERTED"
        assert cart.converted_order_id is not None


def test_identify_links_visitor_to_customer(client, app, auth_headers):
    _ingest(client, [_event("page_view", "id-1")])
    with app.app_context():
        assert db.session.get(AnonymousVisitor, VISITOR).customer_id is None

    response = client.post(
        "/api/v1/tracking/identify",
        json={"anonymousId": VISITOR},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["linked"] is True
    with app.app_context():
        visitor = db.session.get(AnonymousVisitor, VISITOR)
        assert visitor.customer_id is not None
        # رحلته السابقة (قبل التسجيل) انتقلت إلى حسابه
        assert TrackingEvent.query.filter_by(event_id="id-1").first().customer_id == visitor.customer_id


def test_tracking_disabled_accepts_nothing(client, app):
    app.config["TRACKING_ENABLED"] = False
    response = _ingest(client, [_event("page_view", "off-1")])
    assert response.status_code == 200
    assert response.get_json()["data"]["accepted"] == 0


def test_batch_over_limit_rejected(client, app):
    app.config["TRACKING_MAX_BATCH"] = 1
    response = _ingest(client, [_event("page_view", "b-1"), _event("page_view", "b-2")])
    assert response.status_code == 413
