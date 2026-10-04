"""اختبارات الكوبونات والملف الشخصي."""
from __future__ import annotations


def test_validate_valid_coupon(client):
    response = client.post(
        "/api/v1/coupons/validate", json={"code": "SHELIGHT10", "subtotal": 1000}
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["valid"] is True
    assert data["discountType"] == "percent"
    assert data["discountAmount"] == 100.0


def test_validate_unknown_coupon(client):
    response = client.post(
        "/api/v1/coupons/validate", json={"code": "NOTREAL", "subtotal": 1000}
    )
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "invalid_coupon"


def test_validate_min_spend_not_met(client):
    response = client.post(
        "/api/v1/coupons/validate", json={"code": "WELCOME150", "subtotal": 100}
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "min_spend_not_met"


# ---------------------------------------------------------------------------
# الملف الشخصي
# ---------------------------------------------------------------------------


def test_update_profile(client, auth_headers):
    response = client.put(
        "/api/v1/profile",
        headers=auth_headers,
        json={
            "firstName": "Mona",
            "lastName": "Ali",
            "phone": "01012345678",
            "city": "Cairo",
            "newsletter": False,
        },
    )
    assert response.status_code == 200
    customer = response.get_json()["data"]["customer"]
    assert customer["firstName"] == "Mona"
    assert customer["lastName"] == "Ali"
    assert customer["phone"] == "01012345678"
    assert customer["city"] == "Cairo"
    assert customer["newsletter"] is False
    assert customer["email"] == "buyer@example.com"


def test_profile_roundtrip_persists_city_and_names(client, auth_headers):
    """القيم المكتوبة تُقرأ كما هي في طلب لاحق — لا تضيع في التحويل."""
    client.put(
        "/api/v1/profile",
        headers=auth_headers,
        json={"firstName": "Sara", "lastName": "Nour", "city": "Alexandria"},
    )
    customer = client.get("/api/v1/profile", headers=auth_headers).get_json()["data"]["customer"]
    assert customer["firstName"] == "Sara"
    assert customer["lastName"] == "Nour"
    assert customer["city"] == "Alexandria"


def test_profile_rejects_unknown_field(client, auth_headers):
    """`name` غير موجود في العقد — يجب رفضه بدل تجاهله بصمت."""
    response = client.put(
        "/api/v1/profile", headers=auth_headers, json={"name": "Legacy Full Name"}
    )
    assert response.status_code == 422


def test_change_password(client, auth_headers):
    changed = client.put(
        "/api/v1/profile/password",
        headers=auth_headers,
        json={"currentPassword": "password123", "newPassword": "new-secret-99"},
    )
    assert changed.status_code == 200

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "buyer@example.com", "password": "new-secret-99"},
    )
    assert login.status_code == 200

    wrong = client.put(
        "/api/v1/profile/password",
        headers=auth_headers,
        json={"currentPassword": "wrong", "newPassword": "hunter22x"},
    )
    assert wrong.status_code == 401
    assert wrong.get_json()["error"]["code"] == "wrong_password"


def test_wishlist_flow(client, auth_headers):
    pid = int(client.get("/api/v1/products/luminous-glow-serum").get_json()["data"]["id"])

    add = client.post("/api/v1/wishlist/items", headers=auth_headers, json={"productId": pid})
    assert add.status_code == 201
    items = add.get_json()["data"]
    assert len(items) == 1

    listing = client.get("/api/v1/wishlist", headers=auth_headers)
    assert len(listing.get_json()["data"]) == 1

    removed = client.delete(f"/api/v1/wishlist/items/{pid}", headers=auth_headers)
    assert removed.get_json()["data"] == []