"""اختبارات webhook الخاص بـ Bosta.

تغطّي الحالات المطلوبة: طلب صالح، توقيع/هوية خاطئة، تكرار، شحنة غير
معروفة، حمولة تالفة، وفشل قاعدة البيانات.

الحقول المستخدمة هنا مأخوذة كما هي من وثيقة Bosta الرسمية:
https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook/
"""
from __future__ import annotations

import pytest
from sqlalchemy.exc import OperationalError

from app.extensions import db
from app.models import Order, WebhookEvent
from app.modules.shipping.bosta.states import (
    STATUS_CANCELED,
    STATUS_DELIVERED,
    STATUS_EXCEPTION,
    STATUS_OUT_FOR_DELIVERY,
    STATUS_PENDING,
    STATUS_PICKED_UP,
    STATUS_RETURNING,
)
from tests.conftest import product_id
from tests.test_orders import checkout_payload

WEBHOOK_URL = "/api/webhooks/bosta"
TOKEN = "bosta-webhook-secret-token"
HEADER = "X-Bosta-Webhook-Token"

SHIPMENT_ID = "15LmfpKYp0YILntA3jbyd"
TRACKING_NUMBER = "48089608"


@pytest.fixture()
def webhook_secret(app):
    """يفعّل سر التحقق داخل نسخة التطبيق المختبَرة."""
    app.config["BOSTA_WEBHOOK_AUTH_TOKEN"] = TOKEN
    app.config["BOSTA_WEBHOOK_AUTH_HEADER"] = HEADER
    return app


def auth_headers(value: str = TOKEN) -> dict:
    return {HEADER: value}


def bosta_payload(state: int, **overrides) -> dict:
    """حمولة Bosta بحقولها الموثّقة (مثال من الوثيقة)."""
    payload = {
        "_id": SHIPMENT_ID,
        "trackingNumber": TRACKING_NUMBER,
        "state": state,
        "type": "SEND",
        "timeStamp": 1689252908261,
        "deliveryPromiseDate": "13-07-2023",
        "numberOfAttempts": 0,
    }
    payload.update(overrides)
    return payload


def make_order(client, app, **shipment_fields) -> Order:
    """ينشئ طلباً عبر الـ API ثم يربطه بمزوّد الشحن مباشرةً في قاعدة البيانات."""
    pid = product_id(client, "luminous-glow-serum")
    response = client.post(
        "/api/v1/orders/checkout", json=checkout_payload(pid)
    )
    assert response.status_code == 201
    order_number = response.get_json()["data"]["orderNumber"]

    with app.app_context():
        order = Order.query.filter_by(order_number=order_number).first()
        for key, value in shipment_fields.items():
            setattr(order, key, value)
        db.session.add(order)
        db.session.commit()
        return order.id


# ---------------------------------------------------------------------------
# المسار والحماية الأساسية
# ---------------------------------------------------------------------------


def test_webhook_endpoint_is_post_only_at_expected_path(client):
    """المسار النهائي المطلوب: POST /api/webhooks/bosta"""
    response = client.get(WEBHOOK_URL)
    assert response.status_code == 405


def test_webhook_does_not_require_admin_jwt(client, webhook_secret):
    """المستدعي هو خادم Bosta لا مستخدم لوحة — لا JWT ولا صلاحية مدير."""
    response = client.post(
        WEBHOOK_URL,
        json=bosta_payload(45),
        headers=auth_headers(),
    )
    assert response.status_code == 200


def test_webhook_rejects_missing_token(client, webhook_secret):
    response = client.post(WEBHOOK_URL, json=bosta_payload(45))
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"


def test_webhook_rejects_wrong_token(client, webhook_secret):
    response = client.post(
        WEBHOOK_URL,
        json=bosta_payload(45),
        headers=auth_headers("wrong-token"),
    )
    assert response.status_code == 401


def test_webhook_fails_closed_when_no_secret_configured(client, app):
    """بلا سر مُعد يُرفض كل طلب — وجود الـ endpoint ليس دليلاً على الهوية."""
    app.config["BOSTA_WEBHOOK_AUTH_TOKEN"] = ""
    response = client.post(
        WEBHOOK_URL, json=bosta_payload(45), headers=auth_headers()
    )
    assert response.status_code == 503
    assert response.get_json()["error"]["code"] == "webhook_not_configured"


def test_webhook_accepts_configured_custom_header_name(client, app):
    """الطريقة الرسمية: التاجر يختار اسم الترويسة، ونطابق القيمة."""
    app.config["BOSTA_WEBHOOK_AUTH_TOKEN"] = TOKEN
    app.config["BOSTA_WEBHOOK_AUTH_HEADER"] = "X-Custom-Bosta-Auth"
    response = client.post(
        WEBHOOK_URL,
        json=bosta_payload(45),
        headers={"X-Custom-Bosta-Auth": TOKEN},
    )
    assert response.status_code == 200


def test_webhook_ignores_non_configured_header_names(client, app):
    """لا نقبل أسماء ترويسات مخترعة — الاسم المعتمد هو المُعدّ فقط."""
    app.config["BOSTA_WEBHOOK_AUTH_TOKEN"] = TOKEN
    app.config["BOSTA_WEBHOOK_AUTH_HEADER"] = "X-Custom-Bosta-Auth"
    for invented in ("X-Bosta-Webhook-Token", "X-Webhook-Token", "Authorization"):
        response = client.post(
            WEBHOOK_URL,
            json=bosta_payload(45),
            headers={invented: TOKEN},
        )
        assert response.status_code == 401, invented


def test_webhook_fails_closed_without_header_name_configured(client, app):
    """بلا اسم ترويسة لا يوجد ما نطابقه — نرفض بدل التخمين."""
    app.config["BOSTA_WEBHOOK_AUTH_TOKEN"] = TOKEN
    app.config["BOSTA_WEBHOOK_AUTH_HEADER"] = ""
    response = client.post(WEBHOOK_URL, json=bosta_payload(45), headers=auth_headers())
    assert response.status_code == 503
    assert response.get_json()["error"]["code"] == "webhook_not_configured"


# ---------------------------------------------------------------------------
# طلب صالح
# ---------------------------------------------------------------------------


def test_valid_webhook_updates_shipment_and_order(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )

    # 24 = Received at warehouse
    response = client.post(
        WEBHOOK_URL, json=bosta_payload(24), headers=auth_headers()
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["outcome"] == "processed"

    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == "pending"
        # الطلب ما زالProcessing: الاستلام من المستودع لا يعني شحناً.
        assert order.status == "pending"


def test_picked_up_advances_order_to_shipped(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )

    # 41 + SEND = «Heading to customer» = خرج للتوصيل
    response = client.post(
        WEBHOOK_URL, json=bosta_payload(41), headers=auth_headers()
    )
    assert response.status_code == 200

    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == "out_for_delivery"
        assert order.status == "shipped"


def test_delivered_advances_order_to_delivered(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )

    response = client.post(
        WEBHOOK_URL, json=bosta_payload(45), headers=auth_headers()
    )
    assert response.status_code == 200

    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == "delivered"
        assert order.status == "delivered"


def test_webhook_matches_order_by_tracking_number_only(client, app, webhook_secret):
    """إذا لم يطابق `_id`، فالبحث يجري برقم التتبّع."""
    order_id = make_order(
        client, app, shipping_provider="bosta", tracking_number=TRACKING_NUMBER
    )
    response = client.post(
        WEBHOOK_URL,
        json=bosta_payload(45, _id=None),
        headers=auth_headers(),
    )
    assert response.status_code == 200
    with app.app_context():
        assert db.session.get(Order, order_id).shipping_status == "delivered"


def test_webhook_backfills_missing_tracking_number(client, app, webhook_secret):
    """طلب مُنشأ من اللوحة بلا رقم تتبّع: يملؤه الـ webhook."""
    order_id = make_order(
        client, app, shipping_provider="bosta", shipping_provider_order_id=SHIPMENT_ID
    )
    response = client.post(
        WEBHOOK_URL, json=bosta_payload(45), headers=auth_headers()
    )
    assert response.status_code == 200
    with app.app_context():
        assert db.session.get(Order, order_id).tracking_number == TRACKING_NUMBER


def test_numeric_tracking_number_is_matched(client, app, webhook_secret):
    """وثيقة Bosta تعلن String لكن الأمثلة رقم — كلاهما يجب أن يُطابَق."""
    order_id = make_order(
        client, app, shipping_provider="bosta", tracking_number=TRACKING_NUMBER
    )
    response = client.post(
        WEBHOOK_URL,
        json=bosta_payload(45, _id=None, trackingNumber=48089608),
        headers=auth_headers(),
    )
    assert response.status_code == 200
    with app.app_context():
        assert db.session.get(Order, order_id).shipping_status == "delivered"


# ---------------------------------------------------------------------------
# منع التكرار
# ---------------------------------------------------------------------------


def test_duplicate_webhook_is_processed_once(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    payload = bosta_payload(45)

    first = client.post(WEBHOOK_URL, json=payload, headers=auth_headers())
    assert first.get_json()["data"]["outcome"] == "processed"

    second = client.post(WEBHOOK_URL, json=payload, headers=auth_headers())
    assert second.status_code == 200
    assert second.get_json()["data"]["outcome"] == "duplicate"

    with app.app_context():
        events = WebhookEvent.query.filter_by(provider="bosta").all()
        assert len(events) == 1
        assert events[0].processed is True
        assert events[0].order_id == order_id


def test_distinct_state_changes_are_not_deduplicated(client, app, webhook_secret):
    make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    first = client.post(
        WEBHOOK_URL, json=bosta_payload(24), headers=auth_headers()
    )
    second = client.post(
        WEBHOOK_URL, json=bosta_payload(45), headers=auth_headers()
    )
    assert first.get_json()["data"]["outcome"] == "processed"
    assert second.get_json()["data"]["outcome"] == "processed"
    with app.app_context():
        assert WebhookEvent.query.filter_by(provider="bosta").count() == 2


# ---------------------------------------------------------------------------
# حالات غير معروفة / آمنة
# ---------------------------------------------------------------------------


def test_unknown_shipment_does_not_create_order(client, app, webhook_secret):
    before = None
    with app.app_context():
        before = Order.query.count()

    response = client.post(
        WEBHOOK_URL, json=bosta_payload(45), headers=auth_headers()
    )
    # 200 حتى لا تعيد Bosta الإرسال بلا فائدة، لكن بلا إنشاء أي طلب.
    assert response.status_code == 200
    assert response.get_json()["data"]["outcome"] == "unknown_shipment"

    with app.app_context():
        assert Order.query.count() == before
        event = WebhookEvent.query.filter_by(outcome="unknown_shipment").first()
        assert event is not None
        assert event.order_id is None


def test_unknown_state_code_is_ignored_safely(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    response = client.post(
        WEBHOOK_URL, json=bosta_payload(9999), headers=auth_headers()
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["outcome"] == "unknown_status"
    with app.app_context():
        # الطلب لم يُمس: الحالة بقيت الافتراضية "pending" ولم تخترع قيمة.
        order = db.session.get(Order, order_id)
        assert order.shipping_status == "pending"


def test_shipment_status_never_regresses_on_stale_event(client, app, webhook_secret):
    """حدث قديم بعد حدث أحدث: حالة الطلب والشحنة لا ترجعان للخلف."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    client.post(
        WEBHOOK_URL, json=bosta_payload(45, timeStamp=1), headers=auth_headers()
    )
    # 41 (خرجت للتوصيل) أقدم من 45 (تم التسليم) ووصل متأخراً.
    stale = client.post(
        WEBHOOK_URL, json=bosta_payload(41, timeStamp=2), headers=auth_headers()
    )
    assert stale.status_code == 200
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == STATUS_DELIVERED
        assert order.status == "delivered"


def test_exception_after_delivery_does_not_erase_delivery(client, app, webhook_secret):
    """47 Exception بعد التسليم لا يمحو نجاح التسليم من اللوحة."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    client.post(
        WEBHOOK_URL, json=bosta_payload(45, timeStamp=1), headers=auth_headers()
    )
    client.post(
        WEBHOOK_URL, json=bosta_payload(47, timeStamp=2), headers=auth_headers()
    )
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == STATUS_DELIVERED
        assert order.status == "delivered"


def test_exception_before_delivery_is_recorded(client, app, webhook_secret):
    """قبل التسليم، الاستثناء معلومة جديدة تُكتب."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    client.post(
        WEBHOOK_URL, json=bosta_payload(41, timeStamp=1), headers=auth_headers()
    )
    client.post(
        WEBHOOK_URL, json=bosta_payload(47, timeStamp=2), headers=auth_headers()
    )
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == STATUS_EXCEPTION
        # الطلب يبقى shipped: الاستثناء لا يلغي ولا يسلّم.
        assert order.status == "shipped"


def test_failure_can_replace_in_progress_status(client, app, webhook_secret):
    """فشل التسليم بعد الخروج للتوصيل يُكتب (ليس تراجعاً في التسلسل)."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    client.post(
        WEBHOOK_URL, json=bosta_payload(41, timeStamp=1), headers=auth_headers()
    )
    client.post(
        WEBHOOK_URL, json=bosta_payload(100, timeStamp=2), headers=auth_headers()
    )  # 100 = Lost
    with app.app_context():
        assert db.session.get(Order, order_id).shipping_status == "lost"


def test_state_41_depends_on_shipment_type(client, app, webhook_secret):
    """41 مع RTO = شحنة عائدة، ومع SEND = خرجت للتوصيل."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    client.post(
        WEBHOOK_URL,
        json=bosta_payload(41, type="RTO", timeStamp=1),
        headers=auth_headers(),
    )
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == STATUS_RETURNING
        # شحنة عائدة لا تُعد «shipped».
        assert order.status == "pending"


def test_delivery_progression_is_forward_only(client, app, webhook_secret):
    """التسلسل الطبيعي للشحنة: pending -> picked_up -> out_for_delivery."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    # 24 = received at warehouse
    client.post(
        WEBHOOK_URL, json=bosta_payload(24, timeStamp=1), headers=auth_headers()
    )
    with app.app_context():
        assert db.session.get(Order, order_id).shipping_status == STATUS_PENDING

    client.post(
        WEBHOOK_URL, json=bosta_payload(41, timeStamp=2), headers=auth_headers()
    )
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == STATUS_OUT_FOR_DELIVERY
        assert order.status == "shipped"


def test_pickup_status_is_recorded(client, app, webhook_secret):
    """نوع غير معروف مع 41 => الحالة المحايدة (سُحبت)، بلا انتقال للطلب."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    response = client.post(
        WEBHOOK_URL,
        json=bosta_payload(41, type="SOMETHING_NEW", timeStamp=1),
        headers=auth_headers(),
    )
    assert response.status_code == 200
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == STATUS_PICKED_UP
        assert order.status == "shipped"


def test_cancel_status_is_recorded(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    client.post(
        WEBHOOK_URL, json=bosta_payload(49, timeStamp=1), headers=auth_headers()
    )  # 49 = Canceled
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == STATUS_CANCELED
        # إلغاء الشحنة عند Bosta لا يلغي الطلب: قرار تجاري للإدارة.
        assert order.status == "pending"


# ---------------------------------------------------------------------------
# دورة حياة الطلب
# ---------------------------------------------------------------------------


def test_cancelled_order_status_is_not_touched(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
        status="cancelled",
    )
    client.post(
        WEBHOOK_URL,
        json=bosta_payload(45, timeStamp=99),
        headers=auth_headers(),
    )
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.status == "cancelled"
        # حالة الشحنة تُسجَّل رغم ذلك (معلومة مفيدة للوحة).
        assert order.shipping_status == "delivered"


def test_bosta_cancel_does_not_auto_cancel_order(client, app, webhook_secret):
    """إلغاء الشحنة عند Bosta قرار تجاري — لا يُلغي الطلب تلقائياً."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    client.post(
        WEBHOOK_URL,
        json=bosta_payload(49, timeStamp=7),  # 49 = Canceled
        headers=auth_headers(),
    )
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.shipping_status == "canceled"
        assert order.status == "pending"


def test_order_status_never_regresses(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    client.post(
        WEBHOOK_URL, json=bosta_payload(45, timeStamp=1), headers=auth_headers()
    )
    # حدث قديم وصل متأخراً — لا يرجع الطلب من delivered.
    client.post(
        WEBHOOK_URL, json=bosta_payload(24, timeStamp=2), headers=auth_headers()
    )
    with app.app_context():
        assert db.session.get(Order, order_id).status == "delivered"


# ---------------------------------------------------------------------------
# حمولة تالفة
# ---------------------------------------------------------------------------


def test_malformed_json_returns_400(client, webhook_secret):
    response = client.post(
        WEBHOOK_URL,
        data="{not-json",
        content_type="application/json",
        headers=auth_headers(),
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_payload"


def test_non_object_payload_returns_400(client, webhook_secret):
    response = client.post(
        WEBHOOK_URL, data="[1,2,3]", content_type="application/json", headers=auth_headers()
    )
    assert response.status_code == 400


def test_payload_without_identifiers_returns_400(client, webhook_secret):
    response = client.post(
        WEBHOOK_URL, json={"state": 45}, headers=auth_headers()
    )
    assert response.status_code == 400


@pytest.mark.parametrize("payload", [
    {"_id": SHIPMENT_ID},
    {"trackingNumber": TRACKING_NUMBER},
    {"_id": SHIPMENT_ID, "trackingNumber": TRACKING_NUMBER},
    {"_id": SHIPMENT_ID, "state": None},
    {"_id": SHIPMENT_ID, "state": "not-a-number"},
    {"_id": SHIPMENT_ID, "state": 4.5},
])
def test_payload_without_usable_state_returns_400(client, webhook_secret, payload):
    """Bosta ترسل state دائماً؛ حدث بلا حالة لا يصف شيئاً فنرفضه."""
    response = client.post(WEBHOOK_URL, json=payload, headers=auth_headers())
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_payload"


def test_numeric_state_as_string_is_accepted(client, app, webhook_secret):
    """بعض النسخ ترسل state كنص رقمي — نقبله بدل رفضه."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    response = client.post(
        WEBHOOK_URL, json=bosta_payload("45"), headers=auth_headers()
    )
    assert response.status_code == 200
    with app.app_context():
        assert db.session.get(Order, order_id).shipping_status == "delivered"


def test_unknown_fields_are_tolerated(client, app, webhook_secret):
    """Bosta قد تضيف حقولاً مستقبلاً — لا نرفض الطلب بسببها."""
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    response = client.post(
        WEBHOOK_URL,
        json=bosta_payload(45, _someFutureField={"a": 1}),
        headers=auth_headers(),
    )
    assert response.status_code == 200
    with app.app_context():
        assert db.session.get(Order, order_id).shipping_status == "delivered"


def test_verification_happens_before_payload_parsing(client, webhook_secret):
    """طلب بترويسة خاطئة وجسم تالف معاً => 401 لا 400 (لا نكشف تفاصيل)."""
    response = client.post(
        WEBHOOK_URL,
        data="{broken",
        content_type="application/json",
        headers=auth_headers("nope"),
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# فشل قاعدة البيانات
# ---------------------------------------------------------------------------


def test_database_failure_returns_500(client, app, webhook_secret, monkeypatch):
    make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )

    def boom(*args, **kwargs):
        raise OperationalError("SELECT 1", {}, Exception("db down"))

    monkeypatch.setattr(db.session, "commit", boom)

    response = client.post(
        WEBHOOK_URL, json=bosta_payload(45), headers=auth_headers()
    )
    assert response.status_code == 500
    assert response.get_json()["error"]["code"] == "internal_error"


# ---------------------------------------------------------------------------
# حفظ البيانات الحسّاسة
# ---------------------------------------------------------------------------


def test_secret_is_never_persisted_or_echoed(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    response = client.post(
        WEBHOOK_URL, json=bosta_payload(45), headers=auth_headers()
    )
    body = response.get_data(as_text=True)
    assert TOKEN not in body

    with app.app_context():
        event = WebhookEvent.query.filter_by(provider="bosta").first()
        assert event is not None
        assert TOKEN not in repr(event.__dict__)
        # لا نخزّن handset ولا اسم العميل — فقط معرّفات الشحنة.
        assert event.tracking_number == TRACKING_NUMBER
        assert event.provider_event_id == SHIPMENT_ID
        assert event.order_id == order_id


# ---------------------------------------------------------------------------
# لوحة التحكم
# ---------------------------------------------------------------------------


def test_admin_order_detail_exposes_shipment(client, app, webhook_secret):
    order_id = make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    client.post(WEBHOOK_URL, json=bosta_payload(45), headers=auth_headers())

    login = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    token = login.get_json()["data"]["accessToken"]
    with app.app_context():
        from app.models import Order as OrderModel

        order = db.session.get(OrderModel, order_id)
        number = order.order_number

    response = client.get(
        f"/api/v1/admin/orders/{number}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    shipment = response.get_json()["data"]["shipment"]
    assert shipment["provider"] == "bosta"
    assert shipment["trackingNumber"] == TRACKING_NUMBER
    assert shipment["shipmentId"] == SHIPMENT_ID
    assert shipment["status"] == "delivered"


def test_storefront_order_response_does_not_expose_shipment(client, app, webhook_secret):
    """بيانات الشحنة تخصّ اللوحة فقط — لا تخرج مع استجابات المتجر."""
    make_order(
        client,
        app,
        shipping_provider="bosta",
        shipping_provider_order_id=SHIPMENT_ID,
        tracking_number=TRACKING_NUMBER,
    )
    pid = product_id(client, "luminous-glow-serum")
    response = client.post("/api/v1/orders/checkout", json=checkout_payload(pid))
    number = response.get_json()["data"]["orderNumber"]
    listed = client.get("/api/v1/orders").get_json()
    assert "shipment" not in response.get_json()["data"]
    assert all("shipment" not in row for row in listed.get("data", []))
    assert number