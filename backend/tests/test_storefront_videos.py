from __future__ import annotations

import io


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def test_admin_can_upload_and_publish_homepage_video(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    headers = _admin_headers(client)
    upload = client.post(
        "/api/v1/admin/storefront/videos/upload",
        headers=headers,
        data={"file": (io.BytesIO(b"\x00\x00\x00\x18ftypisom" + b"0" * 32), "clip.mp4")},
        content_type="multipart/form-data",
    )

    assert upload.status_code == 201
    video_path = upload.get_json()["data"]["path"]
    assert video_path.startswith("/uploads/videos/")
    assert (tmp_path / "videos" / video_path.rsplit("/", 1)[-1]).is_file()

    payload = {
        "isActive": True,
        "title": "فيديوهات شيلايت",
        "description": "شاهدي منتجاتنا",
        "videos": [{"title": "المنتج", "url": video_path}],
    }
    saved = client.put(
        "/api/v1/admin/storefront/videos",
        headers=headers,
        json=payload,
    )
    assert saved.status_code == 200
    assert client.get("/api/v1/storefront/videos").get_json()["data"] == payload


def test_videos_section_requires_uploaded_files(client):
    headers = _admin_headers(client)
    response = client.put(
        "/api/v1/admin/storefront/videos",
        headers=headers,
        json={
            "isActive": True,
            "title": "فيديو",
            "description": "",
            "videos": [{"title": "خارجي", "url": "https://example.com/video.mp4"}],
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "video_must_be_uploaded"


def test_video_upload_requires_admin(client):
    response = client.post(
        "/api/v1/admin/storefront/videos/upload",
        data={"file": (io.BytesIO(b"\x00\x00\x00\x18ftypisom" + b"0" * 32), "clip.mp4")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 401
