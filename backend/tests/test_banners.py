"""اختبارات بنرات الموقع — الإدارة من اللوحة وعرضها في المتجر."""

import io
import os


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def _create_banner(client, headers, **overrides):
    payload = {
        "section": "HERO",
        "imageUrl": "/uploads/banners/hero-1.png",
        "linkUrl": "/products/luminous-glow-serum",
        "sortOrder": 0,
        "isActive": True,
    }
    payload.update(overrides)
    response = client.post("/api/v1/admin/banners", headers=headers, json=payload)
    return response


def test_public_banners_empty_before_admin(client):
    response = client.get("/api/v1/banners")
    assert response.status_code == 200
    assert response.get_json()["data"] == []


def test_public_banners_only_active_and_section_filter(client):
    headers = _admin_headers(client)
    _create_banner(client, headers, section="HERO", imageUrl="/hero-a.png")
    _create_banner(client, headers, section="EDITORIAL", imageUrl="/edit-a.png")
    _create_banner(client, headers, section="HERO", imageUrl="/hero-hidden.png", isActive=False)

    all_active = client.get("/api/v1/banners").get_json()["data"]
    assert {b["imageUrl"] for b in all_active} == {"/hero-a.png", "/edit-a.png"}
    assert all(b["isActive"] is True for b in all_active)

    hero_only = client.get("/api/v1/banners", query_string={"section": "HERO"}).get_json()["data"]
    assert [b["imageUrl"] for b in hero_only] == ["/hero-a.png"]

    bad = client.get("/api/v1/banners", query_string={"section": "FOOTER"})
    assert bad.status_code == 422


def test_admin_banner_payload_and_ordering(client):
    headers = _admin_headers(client)
    first = _create_banner(client, headers, imageUrl="/one.png", sortOrder=0).get_json()["data"]
    second = _create_banner(client, headers, imageUrl="/two.png", sortOrder=1).get_json()["data"]
    assert first["id"].isdigit()
    assert first["section"] == "HERO"
    assert first["linkUrl"] == "/products/luminous-glow-serum"

    listed = client.get("/api/v1/admin/banners", headers=headers).get_json()["data"]
    assert [b["imageUrl"] for b in listed] == ["/one.png", "/two.png"]
    assert [b["id"] for b in listed] == [first["id"], second["id"]]


def test_admin_patch_toggle_and_soft_delete(client):
    headers = _admin_headers(client)
    banner = _create_banner(client, headers).get_json()["data"]
    banner_id = banner["id"]

    toggled = client.patch(
        f"/api/v1/admin/banners/{banner_id}", headers=headers, json={"isActive": False}
    )
    assert toggled.status_code == 200
    assert toggled.get_json()["data"]["isActive"] is False
    assert client.get("/api/v1/banners").get_json()["data"] == []

    deleted = client.delete(f"/api/v1/admin/banners/{banner_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.get_json()["data"]["isActive"] is False
    # السجل ما زال في اللوحة
    assert client.get("/api/v1/admin/banners", headers=headers).get_json()["data"]


def test_admin_move_banner_reorders_within_section(client):
    headers = _admin_headers(client)
    a = _create_banner(client, headers, imageUrl="/a.png", sortOrder=0).get_json()["data"]
    b = _create_banner(client, headers, imageUrl="/b.png", sortOrder=1).get_json()["data"]
    _create_banner(client, headers, section="EDITORIAL", imageUrl="/edit.png", sortOrder=0)

    moved = client.post(f"/api/v1/admin/banners/{b['id']}/move", headers=headers, json={"direction": "up"})
    assert moved.status_code == 200

    hero = client.get(
        "/api/v1/banners", query_string={"section": "HERO"}
    ).get_json()["data"]
    assert [x["id"] for x in hero] == [b["id"], a["id"]]


def test_admin_upload_banner_image(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    headers = _admin_headers(client)
    response = client.post(
        "/api/v1/admin/banners/upload",
        headers=headers,
        data={"file": (io.BytesIO(b"\x89PNG\r\n\x1a\nfake"), "banner.png")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    path = response.get_json()["data"]["path"]
    assert path.startswith("/uploads/banners/")
    saved = os.path.join(str(tmp_path), path.replace("/uploads/", "").replace("/", os.sep))
    assert os.path.exists(saved)


def test_admin_upload_rejects_bad_extension(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    headers = _admin_headers(client)
    response = client.post(
        "/api/v1/admin/banners/upload",
        headers=headers,
        data={"file": (io.BytesIO(b"not an image"), "evil.exe")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "bad_image_type"


def test_banners_require_admin(client):
    assert client.get("/api/v1/admin/banners").status_code == 401
    assert (
        client.post(
            "/api/v1/admin/banners",
            json={"section": "HERO", "imageUrl": "/x.png"},
        ).status_code
        == 401
    )
