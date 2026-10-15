"""اختبارات إعدادات المتجر — خصوصاً روابط التواصل الاجتماعي في الفوتر."""
from __future__ import annotations


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def _base_payload(**overrides) -> dict:
    payload = {
        "defaultShippingFee": 60,
        "governorateFees": {"cairo": 60, "alexandria": 60},
        "freeShippingThreshold": 1500,
        "announcementAr": "شحن مجاني",
        "announcementEn": "Free shipping",
        "whatsappPhone": "201000000000",
        "socialLinks": {},
    }
    payload.update(overrides)
    return payload


def test_public_settings_expose_empty_social_links_by_default(client):
    data = client.get("/api/v1/storefront/settings").get_json()["data"]
    assert data["socialLinks"] == {"facebook": "", "instagram": "", "tiktok": ""}


def test_admin_can_save_social_links_and_they_surface_publicly(client):
    headers = _admin_headers(client)
    response = client.put(
        "/api/v1/admin/store-settings",
        headers=headers,
        json=_base_payload(
            socialLinks={
                "facebook": "https://facebook.com/shelight",
                "instagram": "instagram.com/shelight",
                "tiktok": "",
            }
        ),
    )
    assert response.status_code == 200
    links = response.get_json()["data"]["socialLinks"]
    # الرابط بلا بروتوكول يُكمَّل بـ https، والفارغ يبقى فارغاً.
    assert links == {
        "facebook": "https://facebook.com/shelight",
        "instagram": "https://instagram.com/shelight",
        "tiktok": "",
    }

    public = client.get("/api/v1/storefront/settings").get_json()["data"]
    assert public["socialLinks"] == links


def test_social_links_accept_missing_payload_key(client):
    headers = _admin_headers(client)
    payload = _base_payload()
    payload.pop("socialLinks")
    response = client.put(
        "/api/v1/admin/store-settings", headers=headers, json=payload
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["socialLinks"] == {
        "facebook": "",
        "instagram": "",
        "tiktok": "",
    }
