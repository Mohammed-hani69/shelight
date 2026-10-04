"""اختبارات إدارة المدونة من لوحة التحكم — CRUD والتمييز والنشر المنطقي."""
from __future__ import annotations


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def _article_payload(**overrides):
    payload = {
        "slug": "new-routine-post",
        "titleEn": "New Routine Post",
        "titleAr": "مقال روتين جديد",
        "excerptEn": "Short teaser",
        "excerptAr": "مقدمة قصيرة",
        "contentEn": ["First paragraph.", "Second paragraph."],
        "contentAr": ["الفقرة الأولى.", "الفقرة الثانية."],
        "category": "العناية بالبشرة",
        "author": "فريق شيلايت",
        "readTime": "قراءة 3 دقائق",
        "publishDate": "2026-08-01",
        "imageUrl": "https://example.com/cover.jpg",
        "isFeatured": False,
        "isPublished": True,
    }
    payload.update(overrides)
    return payload


def test_admin_list_articles(client):
    headers = _admin_headers(client)
    response = client.get("/api/v1/admin/journal", headers=headers)
    assert response.status_code == 200
    articles = response.get_json()["data"]
    assert len(articles) == 3
    sample = articles[0]
    assert sample["slug"] and sample["titleEn"] and sample["publishDate"]
    assert isinstance(sample["contentAr"], list)


def test_admin_create_update_and_get_article(client):
    headers = _admin_headers(client)

    created = client.post("/api/v1/admin/journal", headers=headers, json=_article_payload())
    assert created.status_code == 201
    data = created.get_json()["data"]
    article_id = data["id"]
    assert data["slug"] == "new-routine-post"
    assert data["publishDate"] == "2026-08-01"
    assert data["isPublished"] is True
    assert len(data["contentEn"]) == 2

    fetched = client.get(f"/api/v1/admin/journal/{article_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.get_json()["data"]["titleAr"] == "مقال روتين جديد"

    updated = client.put(
        f"/api/v1/admin/journal/{article_id}",
        headers=headers,
        json=_article_payload(titleEn="Updated Title", isFeatured=True),
    )
    assert updated.status_code == 200
    assert updated.get_json()["data"]["titleEn"] == "Updated Title"

    public = client.get("/api/v1/journal")
    first = public.get_json()["data"][0]
    assert first["slug"] == "new-routine-post"
    assert first["isFeatured"] is True


def test_admin_create_duplicate_slug_rejected(client):
    headers = _admin_headers(client)
    response = client.post(
        "/api/v1/admin/journal",
        headers=headers,
        json=_article_payload(slug="building-your-morning-skin-routine"),
    )
    assert response.status_code == 409


def test_admin_patch_toggles_publish_visibility(client):
    headers = _admin_headers(client)

    created = client.post("/api/v1/admin/journal", headers=headers, json=_article_payload())
    article_id = created.get_json()["data"]["id"]

    patched = client.patch(
        f"/api/v1/admin/journal/{article_id}",
        headers=headers,
        json={"isPublished": False},
    )
    assert patched.status_code == 200
    assert patched.get_json()["data"]["isPublished"] is False

    public = client.get("/api/v1/journal")
    slugs = [a["slug"] for a in public.get_json()["data"]]
    assert "new-routine-post" not in slugs


def test_admin_delete_article_soft(client):
    headers = _admin_headers(client)

    created = client.post("/api/v1/admin/journal", headers=headers, json=_article_payload())
    article_id = created.get_json()["data"]["id"]

    deleted = client.delete(f"/api/v1/admin/journal/{article_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.get_json()["data"]["isPublished"] is False

    still_listed = client.get("/api/v1/admin/journal", headers=headers)
    article = next(a for a in still_listed.get_json()["data"] if a["id"] == article_id)
    assert article["isPublished"] is False

    public = client.get("/api/v1/journal")
    slugs = [a["slug"] for a in public.get_json()["data"]]
    assert "new-routine-post" not in slugs
