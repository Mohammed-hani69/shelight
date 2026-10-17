"""اختبارات إدارة محتوى صفحات الموقع."""
from __future__ import annotations

import io


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def test_public_site_page_is_empty_until_saved(client):
    response = client.get("/api/v1/storefront/pages/about")

    assert response.status_code == 200
    assert response.get_json()["data"] is None


def test_admin_can_save_site_page_and_public_page_returns_it(client):
    headers = _admin_headers(client)
    payload = {
        "eyebrow": "قصتنا",
        "title": "من نحن",
        "description": "رسالة العلامة التجارية.",
        "imageUrl": "",
        "imageAlt": "",
        "items": [
            {
                "title": "العلم أولاً",
                "body": "تركيبات مستوحاة من العلم.",
                "detail": "",
                "kind": "",
            }
        ],
    }

    response = client.put(
        "/api/v1/admin/storefront/pages/about",
        headers=headers,
        json=payload,
    )

    assert response.status_code == 200
    assert response.get_json()["data"] == {"key": "about", **payload}
    assert client.get("/api/v1/storefront/pages/about").get_json()["data"] == {
        "key": "about",
        **payload,
    }


def test_site_page_management_requires_admin(client):
    response = client.put(
        "/api/v1/admin/storefront/pages/faq",
        json={"title": "الأسئلة الشائعة"},
    )

    assert response.status_code == 401


def test_unknown_site_page_is_rejected(client):
    response = client.get("/api/v1/storefront/pages/not-a-page")

    assert response.status_code == 404


def test_admin_can_upload_site_page_image(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    response = client.post(
        "/api/v1/admin/storefront/pages/about/image",
        headers=_admin_headers(client),
        data={"file": (io.BytesIO(b"\x89PNG\r\n\x1a\nimage bytes"), "about.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    path = response.get_json()["data"]["path"]
    assert path.startswith("/uploads/site-pages/")
    assert (tmp_path / "site-pages" / path.rsplit("/", 1)[-1]).is_file()


def test_site_page_image_upload_requires_admin(client):
    response = client.post(
        "/api/v1/admin/storefront/pages/about/image",
        data={"file": (io.BytesIO(b"\x89PNG\r\n\x1a\nimage bytes"), "about.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 401


def test_admin_cannot_save_external_site_page_image_url(client):
    response = client.put(
        "/api/v1/admin/storefront/pages/about",
        headers=_admin_headers(client),
        json={
            "eyebrow": "",
            "title": "من نحن",
            "description": "",
            "imageUrl": "https://example.com/about.png",
            "imageAlt": "",
            "items": [],
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "site_page_image_must_be_uploaded"
