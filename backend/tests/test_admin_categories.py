"""اختبارات إدارة الفئات/الأقسام من لوحة التحكم + تأثيرها على الموقع."""


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def test_admin_list_categories_tree(client):
    headers = _admin_headers(client)
    response = client.get("/api/v1/admin/categories", headers=headers)
    assert response.status_code == 200
    roots = response.get_json()["data"]
    assert roots
    skin = next(category for category in roots if category["slug"] == "skin-care")
    assert skin["isFeatured"] is True
    assert skin["isActive"] is True
    assert skin["children"]
    assert skin["children"][0]["parentSlug"] == "skin-care"
    assert any(category["productsCount"] > 0 for category in roots)


def test_admin_create_and_update_category(client):
    headers = _admin_headers(client)
    created = client.post(
        "/api/v1/admin/categories",
        headers=headers,
        json={
            "slug": "makeup",
            "nameAr": "المكياج",
            "nameEn": "Makeup",
            "descriptionAr": "أقسام المكياج",
            "descriptionEn": "Makeup categories",
            "imageUrl": "https://images.unsplash.com/photo-makeup",
            "sortOrder": 9,
            "isFeatured": True,
            "isActive": True,
        },
    )
    assert created.status_code == 201
    data = created.get_json()["data"]
    assert data["slug"] == "makeup"
    assert data["isFeatured"] is True
    assert data["isActive"] is True
    assert data["sortOrder"] == 9
    category_id = int(data["id"])

    updated = client.put(
        f"/api/v1/admin/categories/{category_id}",
        headers=headers,
        json={
            "slug": "makeup",
            "nameAr": "المكياج والعناية",
            "nameEn": "Makeup & Care",
            "descriptionAr": "",
            "descriptionEn": "",
            "imageUrl": None,
            "parentSlug": None,
            "sortOrder": 9,
            "isFeatured": False,
            "isActive": True,
        },
    )
    assert updated.status_code == 200
    data = updated.get_json()["data"]
    assert data["nameAr"] == "المكياج والعناية"
    assert data["nameEn"] == "Makeup & Care"
    assert data["isFeatured"] is False
    assert data["imageUrl"] is None


def test_admin_duplicate_category_slug(client):
    headers = _admin_headers(client)
    response = client.post(
        "/api/v1/admin/categories",
        headers=headers,
        json={"slug": "hair-care", "nameAr": "مكرر", "nameEn": "Duplicate"},
    )
    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "slug_taken"


def test_admin_patch_category_toggles(client):
    headers = _admin_headers(client)
    response = client.patch(
        "/api/v1/admin/categories/1",
        headers=headers,
        json={"isFeatured": False},
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["isFeatured"] is False


def test_admin_soft_delete_hides_category_site_wide(client):
    headers = _admin_headers(client)
    # إنشاء فئة خاصة ثم إخفاؤها
    created = client.post(
        "/api/v1/admin/categories",
        headers=headers,
        json={"slug": "temporary", "nameAr": "مؤقت", "nameEn": "Temporary"},
    )
    category_id = int(created.get_json()["data"]["id"])

    deleted = client.delete(f"/api/v1/admin/categories/{category_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.get_json()["data"]["isActive"] is False

    # تختفي من شجرة الفئات العامة
    public = client.get("/api/v1/categories").get_json()["data"]
    assert all(category["slug"] != "temporary" for category in public)


def test_admin_move_category_reorders(client):
    headers = _admin_headers(client)
    before = client.get("/api/v1/admin/categories", headers=headers).get_json()["data"]
    skin = next(category for category in before if category["slug"] == "skin-care")
    next_sibling = before[before.index(skin) + 1]

    moved = client.post(f"/api/v1/admin/categories/{skin['id']}/move", headers=headers, json={"direction": "down"})
    assert moved.status_code == 200

    after = client.get("/api/v1/admin/categories", headers=headers).get_json()["data"]
    old_skin_index = before.index(skin)
    assert after[old_skin_index]["slug"] == next_sibling["slug"]
    assert after[old_skin_index + 1]["slug"] == skin["slug"]


def test_public_categories_featured_filter(client):
    featured = client.get("/api/v1/categories", query_string={"featured": "true"}).get_json()["data"]
    assert featured
    assert all(category["isFeatured"] is True for category in featured)
    # البذرة تميّز ثلاثة أقسام فقط من الجذور
    assert {category["slug"] for category in featured} == {"skin-care", "hair-care", "eye-care"}