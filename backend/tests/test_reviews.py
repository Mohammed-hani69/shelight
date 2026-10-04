"""اختبارات المراجعات: الإنشاء للزائر والمسجّل، وعداد "مفيد"، وحقل اسم المؤلف."""
from __future__ import annotations

from tests.conftest import product_id


def test_guest_review_requires_author_name(client):
    """مراجعة الزائر بلا اسم مرفوضة برسالة واضحة لا 422 غامض."""
    response = client.post(
        "/api/v1/products/luminous-glow-serum/reviews",
        json={"rating": 5, "body": "منتج رائع"},
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "author_name_required"


def test_guest_review_with_author_name_is_created(client):
    """مفتاح authorName (camelCase) يجب أن يصل فعلاً إلى الخدمة."""
    response = client.post(
        "/api/v1/products/luminous-glow-serum/reviews",
        json={
            "rating": 4,
            "title": "جيد جداً",
            "body": "النتيجة ظهرت خلال أسبوعين",
            "authorName": "زائر",
        },
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["authorName"] == "زائر"
    assert data["isVerified"] is False
    assert data["helpfulCount"] == 0


def test_member_review_is_verified_and_uses_account_name(client, auth_headers):
    """العضو المسجّل يُنشئ مراجعة verified باسمه دون إرسال authorName."""
    response = client.post(
        "/api/v1/products/luminous-glow-serum/reviews",
        json={"rating": 5, "body": "أفضل شراء هذا الشهر"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["isVerified"] is True
    assert data["authorName"] == "Nada Ali"


def test_created_review_appears_in_listing(client):
    """المراجعة المنشورة يجب أن تظهر في سرد المنتج."""
    client.post(
        "/api/v1/products/luminous-glow-serum/reviews",
        json={"rating": 5, "body": "تستحق التجربة", "authorName": "قارئ"},
    )
    listing = client.get("/api/v1/products/luminous-glow-serum/reviews")
    assert listing.status_code == 200
    authors = [item["authorName"] for item in listing.get_json()["data"]]
    assert "قارئ" in authors


def test_review_rating_bounds_enforced(client):
    response = client.post(
        "/api/v1/products/luminous-glow-serum/reviews",
        json={"rating": 9, "body": "مبالغ", "authorName": "زائر"},
    )
    assert response.status_code == 422


def test_mark_helpful_increments_counter(client):
    review = client.get("/api/v1/products/luminous-glow-serum/reviews").get_json()["data"][0]
    before = review["helpfulCount"]
    response = client.post(f"/api/v1/reviews/{review['id']}/helpful")
    assert response.status_code == 200
    assert response.get_json()["data"]["helpfulCount"] == before + 1


def test_review_count_reflects_published_reviews(client):
    """عدد المراجعات المعروضة في بطاقة المنتج يطابق المنشور فعلياً."""
    product_id(client, "luminous-glow-serum")
    before = client.get("/api/v1/products/luminous-glow-serum").get_json()["data"]["reviewCount"]
    client.post(
        "/api/v1/products/luminous-glow-serum/reviews",
        json={"rating": 5, "body": "مراجعة إضافية", "authorName": "زائر"},
    )
    after = client.get("/api/v1/products/luminous-glow-serum").get_json()["data"]["reviewCount"]
    assert after == before + 1
