"""اختبارات التقاط هوية العميل المحتمل (Lead Capture) بلا بريد إلكتروني."""
from __future__ import annotations

from datetime import timedelta

from app.core.utils import utcnow
from app.extensions import db
from app.models import ContactLead, JourneyCart
from tests.conftest import product_id

VISITOR = "cccccccc-cccc-cccc-cccc-cccccccccccc"
SESSION = "33333333-3333-3333-3333-333333333333"
LEAD_HEADERS = {"X-Anonymous-Id": VISITOR}


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def _save_lead(client, payload, extra_headers=None):
    headers = {**LEAD_HEADERS, **(extra_headers or {})}
    return client.post("/api/v1/tracking/checkout-lead", json=payload, headers=headers)


def test_lead_partial_save_dedupes_secondary_phone(client, app):
    response = _save_lead(
        client,
        {
            "checkoutKey": "ck-1",
            "sessionId": SESSION,
            "fullName": "منى أحمد",
            "primaryPhone": "01012345678",
            "secondaryPhone": "+201012345678",
            "city": "القاهرة",
        },
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "PARTIAL"

    with app.app_context():
        lead = ContactLead.query.one()
        # الهاتف الموحّد من الصيغتين، والهاتف الثاني المساوي يُسقط
        assert lead.normalized_phone == "1012345678"
        assert lead.secondary_phone is None
        assert lead.visitor_id == VISITOR

    # حفظ جزئي لاحق لا ينشئ سجلاً جديداً ولا يمحو المحفوظ
    response = _save_lead(
        client,
        {
            "checkoutKey": "ck-1",
            "address": "شارع النيل 12",
            "governorate": "القاهرة",
            "secondaryPhone": "01198765432",
        },
    )
    assert response.get_json()["data"]["status"] == "COMPLETE"
    with app.app_context():
        lead = ContactLead.query.one()
        assert lead.full_name == "منى أحمد"
        assert lead.address == "شارع النيل 12"
        assert lead.secondary_phone == "01198765432"


def test_lead_links_authenticated_customer(client, app, auth_headers):
    response = _save_lead(
        client,
        {"checkoutKey": "ck-auth", "fullName": "فاطمة", "primaryPhone": "01234567890"},
        extra_headers=auth_headers,
    )
    assert response.status_code == 200
    with app.app_context():
        me = client.get("/api/v1/auth/me", headers=auth_headers).get_json()["data"]["customer"]
        assert ContactLead.query.one().customer_id == int(me["id"])


def test_lead_resolves_existing_customer_by_phone(client, app):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "match@example.com",
            "password": "password123",
            "firstName": "Mona",
            "phone": "01555555555",
        },
    )
    with app.app_context():
        from app.models import Customer

        customer_id = Customer.query.filter_by(email="match@example.com").one().id

    _save_lead(
        client,
        {"checkoutKey": "ck-match", "fullName": "منى", "primaryPhone": "+201555555555"},
    )
    with app.app_context():
        # الهوية تُحلّ لعميل مسجَّل بنفس الهاتف حتى لو كان الضيف مجهولاً
        assert ContactLead.query.one().customer_id == customer_id


def test_abandoned_cart_payload_includes_lead_identity(client, app):
    pid = product_id(client, "luminous-glow-serum")
    client.post(
        "/api/v1/tracking/events",
        json={
            "events": [
                {
                    "eventId": "lead-cart-1",
                    "name": "add_to_cart",
                    "sessionId": SESSION,
                    "properties": {"productId": pid, "quantity": 1},
                }
            ]
        },
        headers=LEAD_HEADERS,
    )
    _save_lead(
        client,
        {
            "checkoutKey": "ck-abandon",
            "sessionId": SESSION,
            "fullName": "هدى سمير",
            "primaryPhone": "01099998888",
            "address": "6 أكتوبر",
            "city": "الجيزة",
            "governorate": "الجيزة",
        },
    )

    with app.app_context():
        cart = JourneyCart.query.filter_by(visitor_id=VISITOR).first()
        cart.last_activity_at = utcnow() - timedelta(minutes=120)
        db.session.commit()

    client.post("/api/v1/admin/analytics/run-abandonment", headers=_admin_headers(client))
    data = client.get(
        "/api/v1/admin/analytics/abandoned-carts",
        headers=_admin_headers(client),
        query_string={"days": 30},
    ).get_json()["data"]
    cart_payload = next(item for item in data if item["visitorId"] == VISITOR)
    assert cart_payload["customerName"] == "هدى سمير"
    assert cart_payload["primaryPhone"] == "01099998888"
    assert cart_payload["abandonedAt"] is not None
    assert cart_payload["contactEligible"] is True


def test_phone_save_merges_phoneless_context_lead(client, app):
    # حفظ جزئي بالاسم فقط ينشئ سجلاً بلا هاتف.
    _save_lead(client, {"checkoutKey": "ck-merge", "fullName": "ريم"})
    with app.app_context():
        assert ContactLead.query.count() == 1

    # ثم يصل الهاتف لنفس السياق: يجب تحديث السجل القائم لا إنشاء سجل متعارض.
    response = _save_lead(
        client,
        {"checkoutKey": "ck-merge", "fullName": "ريم", "primaryPhone": "01077778888"},
    )
    assert response.status_code == 200
    with app.app_context():
        leads = ContactLead.query.all()
        assert len(leads) == 1
        assert leads[0].normalized_phone == "1077778888"


def test_phone_save_merges_across_contexts(client, app):
    v1 = {"X-Anonymous-Id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1"}
    v2 = {"X-Anonymous-Id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2"}
    _save_lead(
        client,
        {"checkoutKey": "ck-a", "fullName": "أ", "primaryPhone": "01066667777"},
        extra_headers=v1,
    )
    # زائر آخر حفظ اسمه بلا هاتف، ثم أدخل نفس الهاتف.
    _save_lead(client, {"checkoutKey": "ck-b", "fullName": "ب"}, extra_headers=v2)
    response = _save_lead(
        client,
        {"checkoutKey": "ck-b", "fullName": "ب", "primaryPhone": "01066667777"},
        extra_headers=v2,
    )
    assert response.status_code == 200
    with app.app_context():
        assert ContactLead.query.count() == 1
        assert ContactLead.query.filter_by(normalized_phone="1066667777").count() == 1


def test_overview_counts_leads(client):
    _save_lead(client, {"fullName": "سارة", "primaryPhone": "01111112222"})
    data = client.get(
        "/api/v1/admin/analytics/overview",
        headers=_admin_headers(client),
        query_string={"days": 30},
    ).get_json()["data"]
    assert data["leads"] == 1


def test_lead_requires_some_identity_field(client):
    response = _save_lead(client, {"checkoutKey": "ck-empty"})
    assert response.status_code == 200
    assert response.get_json()["data"]["saved"] is False


def test_repeated_lead_saves_keep_single_lead(client, app):
    # حفظ متكرر سريع بنفس الهاتف من زوّار مختلفين لا ينشئ سجلات مكررة ولا يفشل.
    for i in range(5):
        response = _save_lead(
            client,
            {
                "checkoutKey": f"ck-race-{i}",
                "fullName": "نور",
                "primaryPhone": "01033334444",
            },
            extra_headers={"X-Anonymous-Id": f"dddddddd-dddd-dddd-dddd-dddddddddd{i:02d}"},
        )
        assert response.status_code == 200
    with app.app_context():
        assert ContactLead.query.filter_by(normalized_phone="1033334444").count() == 1


def test_lead_accepts_anonymous_id_in_body(client, app):
    # الواجهة ترسل anonymousId في الجسم مع طلبات keepalive بدل الترويسة.
    response = client.post(
        "/api/v1/tracking/checkout-lead",
        json={
            "anonymousId": VISITOR,
            "fullName": "ليلى",
            "primaryPhone": "01012340000",
        },
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["saved"] is True
    with app.app_context():
        assert ContactLead.query.one().visitor_id == VISITOR
