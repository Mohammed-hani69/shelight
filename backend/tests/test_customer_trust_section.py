from __future__ import annotations

import io


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    access_token = response.get_json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {access_token}"}


def test_admin_can_upload_and_publish_customer_trust_images(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    headers = _admin_headers(client)
    upload = client.post(
        "/api/v1/admin/storefront/customer-trust/image",
        headers=headers,
        data={"file": (io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"0" * 32), "customer.png")},
        content_type="multipart/form-data",
    )

    assert upload.status_code == 201
    image_path = upload.get_json()["data"]["path"]
    assert image_path.startswith("/uploads/customer-trust/")
    assert (tmp_path / "customer-trust" / image_path.rsplit("/", 1)[-1]).is_file()

    payload = {
        "isActive": True,
        "title": "ثقة عملائنا فينا",
        "description": "تجارب حقيقية من عميلاتنا",
        "images": [{"title": "تجربة عميلة", "url": image_path}],
    }
    saved = client.put(
        "/api/v1/admin/storefront/customer-trust",
        headers=headers,
        json=payload,
    )

    assert saved.status_code == 200
    assert client.get("/api/v1/storefront/customer-trust").get_json()["data"] == payload

    payload["isActive"] = False
    disabled = client.put(
        "/api/v1/admin/storefront/customer-trust",
        headers=headers,
        json=payload,
    )
    assert disabled.status_code == 200
    assert client.get("/api/v1/storefront/customer-trust").get_json()["data"] is None


def test_customer_trust_section_rejects_unuploaded_images(client):
    headers = _admin_headers(client)
    response = client.put(
        "/api/v1/admin/storefront/customer-trust",
        headers=headers,
        json={
            "isActive": True,
            "title": "ثقة عملائنا",
            "description": "",
            "images": [{"title": "صورة", "url": "https://example.com/photo.png"}],
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "customer_trust_image_must_be_uploaded"


def test_customer_trust_image_upload_requires_admin(client):
    response = client.post(
        "/api/v1/admin/storefront/customer-trust/image",
        data={"file": (io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"0" * 32), "customer.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 401
