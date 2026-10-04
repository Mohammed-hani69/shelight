from __future__ import annotations


def admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def test_admin_bosta_settings_round_trip(client):
    headers = admin_headers(client)

    response = client.post(
        "/api/v1/admin/shipping/bosta",
        json={
            "enabled": True,
            "environment": "sandbox",
            "apiKey": "bosta-1234567890",
            "clientId": "client-42",
            "secret": "s3cr3t-key",
            "defaultPickupLocation": "Cairo",
            "defaultDeliveryType": "standard",
            "defaultPackageType": "box",
            "defaultShippingFee": 45.0,
        },
        headers=headers,
    )

    assert response.status_code in {200, 201}
    payload = response.get_json()["data"]
    assert payload["provider"] == "bosta"
    assert payload["enabled"] is True
    assert payload["environment"] == "sandbox"
    assert payload["apiKeyMasked"]
    assert payload["apiKeyMasked"] != "bosta-1234567890"

    get_response = client.get("/api/v1/admin/shipping/bosta", headers=headers)
    assert get_response.status_code == 200
    get_payload = get_response.get_json()["data"]
    assert get_payload["provider"] == "bosta"
    assert get_payload["apiKeyMasked"]


def test_admin_bosta_connection_check_endpoint(client):
    headers = admin_headers(client)

    response = client.post(
        "/api/v1/admin/shipping/bosta/test",
        json={"apiKey": "test-key", "clientId": "client-42", "secret": "secret"},
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert "ok" in payload or "status" in payload
