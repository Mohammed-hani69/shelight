"""اختبارات المصادقة: تسجيل، دخول، بياناتي، وتجديد التوكن."""
from __future__ import annotations


def test_register_and_login_flow(client):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "Nada@Example.com",  # يُجعل صغيراً
            "password": "password123",
            "firstName": "Nada",
            "lastName": "Ali",
            "phone": "+963 11 223 4455",
            "newsletter": True,
        },
    )
    assert register.status_code == 201
    data = register.get_json()["data"]
    assert data["accessToken"]
    assert data["refreshToken"]
    assert data["customer"]["email"] == "nada@example.com"
    assert data["customer"]["newsletter"] is True
    assert data["customer"]["firstName"] == "Nada"
    assert data["customer"]["phone"] == "+963 11 223 4455"

    duplicate = client.post(
        "/api/v1/auth/register",
        json={
            "email": "nada@example.com",
            "password": "password123",
            "firstName": "Nada",
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"]["code"] == "email_taken"


def test_login_success_and_failure(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "sara@example.com",
            "password": "password123",
            "firstName": "Sara",
        },
    )

    ok = client.post(
        "/api/v1/auth/login",
        json={"email": "sara@example.com", "password": "password123"},
    )
    assert ok.status_code == 200
    assert ok.get_json()["data"]["accessToken"]

    bad = client.post(
        "/api/v1/auth/login",
        json={"email": "sara@example.com", "password": "wrong-pass"},
    )
    assert bad.status_code == 401
    assert bad.get_json()["error"]["code"] == "invalid_credentials"


def test_me_requires_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    with client.application.app_context():
        pass


def test_me_returns_current_customer(client, auth_headers):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    customer = response.get_json()["data"]["customer"]
    assert customer["email"] == "buyer@example.com"
    assert customer["firstName"] == "Nada"


def test_short_password_rejected(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "weak@example.com",
            "password": "1234567",
            "firstName": "Weak",
        },
    )
    assert response.status_code == 422


def test_register_requires_first_name(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "noname@example.com", "password": "password123"},
    )
    assert response.status_code == 422


def test_phone_only_registration_and_login(client):
    phone = "01012345678"
    registered = client.post(
        "/api/v1/auth/register",
        json={
            "firstName": "Mona",
            "phone": phone,
            "address": "15 Nile Street",
            "governorate": "Cairo",
            "password": phone,
        },
    )
    assert registered.status_code == 201
    customer = registered.get_json()["data"]["customer"]
    assert customer["email"] is None
    assert customer["phone"] == phone
    assert customer["address"] == "15 Nile Street"
    assert customer["governorate"] == "Cairo"

    logged_in = client.post(
        "/api/v1/auth/login", json={"phone": phone, "password": phone}
    )
    assert logged_in.status_code == 200


def test_phone_registration_requires_address(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"firstName": "Mona", "phone": "01012345678", "password": "01012345678"},
    )
    assert response.status_code == 422