"""اختبارات تحليلات الرحلة — نظرة عامة، المسار، السلال، والخط الزمني."""
from __future__ import annotations

from tests.conftest import product_id

VISITOR = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
SESSION = "22222222-2222-2222-2222-222222222222"


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def _event(name, event_id, **properties):
    return {
        "eventId": event_id,
        "name": name,
        "sessionId": SESSION,
        "properties": properties,
    }


def _ingest(client, events):
    return client.post(
        "/api/v1/tracking/events",
        json={"events": events},
        headers={"X-Anonymous-Id": VISITOR},
    )


def _seed_funnel(client):
    pid = product_id(client, "luminous-glow-serum")
    _ingest(
        client,
        [
            _event("page_view", "f-1"),
            _event("product_view", "f-2", productId=pid),
            _event("add_to_cart", "f-3", productId=pid, quantity=1),
            _event("begin_checkout", "f-4", checkoutKey="chk-f"),
        ],
    )
    client.post(
        "/api/v1/orders/checkout",
        json={
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
            "checkoutKey": "chk-f",
        },
        headers={"X-Anonymous-Id": VISITOR},
    )


def test_analytics_endpoints_require_admin(client):
    for path in ("overview", "funnel", "abandoned-carts", "visitors"):
        assert client.get(f"/api/v1/admin/analytics/{path}").status_code == 401


def test_overview_reports_activity(client):
    _seed_funnel(client)
    response = client.get(
        "/api/v1/admin/analytics/overview",
        headers=_admin_headers(client),
        query_string={"days": 30},
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["visitors"] >= 1
    assert data["sessions"] >= 1
    assert data["pageViews"] >= 1
    assert data["productViews"] >= 1
    assert data["addToCarts"] >= 1
    assert data["purchases"] >= 1
    assert data["revenue"] > 0
    assert data["conversionRate"] > 0


def test_funnel_steps(client):
    _seed_funnel(client)
    data = client.get(
        "/api/v1/admin/analytics/funnel", headers=_admin_headers(client)
    ).get_json()["data"]
    names = [step["name"] for step in data["steps"]]
    assert names == ["page_view", "product_view", "add_to_cart", "begin_checkout", "purchase"]
    assert data["steps"][0]["rate"] == 100.0


def test_visitor_timeline(client):
    _seed_funnel(client)
    data = client.get(
        f"/api/v1/admin/analytics/visitors/{VISITOR}/timeline",
        headers=_admin_headers(client),
    ).get_json()["data"]
    assert data["visitor"]["id"] == VISITOR
    event_names = {event["name"] for event in data["events"]}
    assert "page_view" in event_names
    assert data["carts"]


def test_customer_timeline_includes_linked_visitor_events(client, auth_headers):
    _ingest(client, [_event("page_view", "ct-1")])
    client.post("/api/v1/tracking/identify", json={"anonymousId": VISITOR}, headers=auth_headers)
    customer_id = int(
        client.get("/api/v1/auth/me", headers=auth_headers)
        .get_json()["data"]["customer"]["id"]
    )

    data = client.get(
        f"/api/v1/admin/analytics/customers/{customer_id}/timeline",
        headers=_admin_headers(client),
    ).get_json()["data"]
    assert data["customer"]["id"] == customer_id
    assert any(event["eventId"] == "ct-1" for event in data["events"])
