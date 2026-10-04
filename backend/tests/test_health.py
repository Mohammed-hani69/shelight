"""اختبارات السلامة العامة: health و shape موحد للخطأ و 404."""
from __future__ import annotations


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_unknown_route_returns_json_404(client):
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    body = response.get_json()
    assert body["error"]["code"] == "not_found"
    assert isinstance(body["error"]["message"], str)


def test_invalid_json_body_returns_400(client):
    response = client.post(
        "/api/v1/auth/login", data="not json", content_type="application/json"
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_json"


def test_bad_fields_return_422(client):
    # جسم JSON صالح لكن حقل password ناقص → تحقق Marshmallow
    response = client.post(
        "/api/v1/auth/login", json={"email": "someone@example.com"}
    )
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "validation_error"