from decimal import Decimal
import json

from app.extensions import db
from app.models import Order, ShippingProviderSettings
from app.modules.shipping import sariee
from app.modules.shipping.sariee import SarieeClient


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def _create_order(app, order_number="SL-SARIEE-1"):
    with app.app_context():
        order = Order(
            order_number=order_number,
            status="pending",
            subtotal=Decimal("350.00"),
            shipping_cost=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            total=Decimal("350.00"),
            payment_method="cod",
            payment_status="pending",
            shipping_first_name="Ahmed",
            shipping_last_name="Ali",
            shipping_phone="01001234567",
            shipping_address="12 Abbas El Akkad St",
            shipping_city="Nasr City",
            shipping_governorate="Cairo",
        )
        db.session.add(order)
        db.session.commit()
        return order.order_number


def _configure_sariee(client, headers):
    response = client.put(
        "/api/v1/admin/shipping/sariee/settings",
        headers=headers,
        json={
            "apiKey": "test-api-key",
            "pickupLocationId": "pickup-test-id",
            "defaultWeightKg": 1.2,
            "enabled": True,
        },
    )
    assert response.status_code == 200


def test_sariee_settings_encrypt_api_key_and_return_only_masked_value(app, client):
    headers = _admin_headers(client)
    _configure_sariee(client, headers)

    with app.app_context():
        record = ShippingProviderSettings.query.filter_by(provider="sariee").one()
        assert record.api_key_encrypted != "test-api-key"
        assert "test-api-key" not in record.api_key_encrypted

    response = client.get("/api/v1/admin/shipping/sariee/settings", headers=headers)
    data = response.get_json()["data"]
    assert data["apiConfigured"] is True
    assert data["apiKeyMasked"].endswith("-key")
    assert "test-api-key" not in str(data)


def test_create_and_activate_sariee_draft_for_order(app, client, monkeypatch):
    headers = _admin_headers(client)
    _configure_sariee(client, headers)
    order_number = _create_order(app)
    create_calls = []
    activate_calls = []

    def create_order(self, payload):
        create_calls.append((self.api_key, payload))
        return {"data": {"id": "sariee-order-123"}}

    def activate_order(self, order_id, pickup_location_id):
        activate_calls.append((self.api_key, order_id, pickup_location_id))
        return {"tracking_number": "TRK-123"}

    monkeypatch.setattr(SarieeClient, "create_order", create_order)
    monkeypatch.setattr(SarieeClient, "activate_order", activate_order)

    draft_response = client.post(
        f"/api/v1/admin/shipping/sariee/orders/{order_number}/draft",
        headers=headers,
    )
    assert draft_response.status_code == 201
    assert draft_response.get_json()["data"]["sarieeOrderId"] == "sariee-order-123"
    assert create_calls[0][0] == "test-api-key"
    assert create_calls[0][1]["customer_name"] == "Ahmed Ali"
    assert create_calls[0][1]["weight_kg"] == 1.2
    assert create_calls[0][1]["cod_amount"] == 350.0

    activate_response = client.post(
        f"/api/v1/admin/shipping/sariee/orders/{order_number}/activate",
        headers=headers,
    )
    assert activate_response.status_code == 200
    assert activate_response.get_json()["data"]["trackingNumber"] == "TRK-123"
    assert activate_calls == [("test-api-key", "sariee-order-123", "pickup-test-id")]

    with app.app_context():
        saved_order = Order.query.filter_by(order_number=order_number).one()
        assert saved_order.shipping_provider == "sariee"
        assert saved_order.shipping_provider_order_id == "sariee-order-123"
        assert saved_order.tracking_number == "TRK-123"
        assert saved_order.shipping_status == "active"


def test_sariee_client_uses_documented_endpoints_and_auth_header(monkeypatch):
    requests = []

    class FakeResponse:
        def __init__(self, body):
            self.body = body

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def read(self):
            return self.body

    def fake_urlopen(request, timeout):
        requests.append(request)
        assert timeout == 25
        return FakeResponse(b'{"data":{"id":"sariee-123"}}')

    monkeypatch.setattr(sariee, "urlopen", fake_urlopen)
    client = SarieeClient(api_key="private-test-key", base_url="https://sariee.example")
    payload = {"customer_name": "Ahmed Ali"}
    client.create_order(payload)
    client.activate_order("sariee/123", "pickup-123")

    assert requests[0].full_url == "https://sariee.example/api/merchant-api/orders"
    assert requests[0].get_method() == "POST"
    assert json.loads(requests[0].data) == payload
    assert any(
        key.lower() == "x-api-key" and value == "private-test-key"
        for key, value in requests[0].header_items()
    )
    assert requests[1].full_url == "https://sariee.example/api/merchant-api/orders/sariee%2F123/activate"
    assert json.loads(requests[1].data) == {"pickup_location_id": "pickup-123"}
