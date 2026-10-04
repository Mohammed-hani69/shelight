"""اختبارات الباقات — الوعد الأساسي أن سعر الباقة المُعلن هو ما يُدفع فعلاً."""
from __future__ import annotations



def _bundles(client, query: str = ""):
    response = client.get(f"/api/v1/bundles{query}")
    assert response.status_code == 200
    return response.get_json()["data"]


def test_list_bundles_returns_seeded_bundles(client):
    bundles = _bundles(client)
    assert len(bundles) == 3
    slugs = {b["slug"] for b in bundles}
    assert slugs == {"luminous-daily-routine", "bright-eye-duo", "silky-roots-to-tips"}


def test_bundle_carries_products_prices_and_coupon(client):
    bundle = _bundles(client)[0]
    assert bundle["items"], "الباقة يجب أن تحمل أعضائها"
    assert bundle["itemCount"] == sum(item["quantity"] for item in bundle["items"])
    for item in bundle["items"]:
        assert item["product"]["slug"]
        assert item["product"]["images"], "صور المنتج مطلوبة لعرض بطاقات الأبناء"
    assert bundle["price"] < bundle["compareAtPrice"]
    assert bundle["couponCode"]


def test_bundle_compare_at_price_matches_member_prices(client):
    """سعر الشراء منفردين = compareAtPrice، وإلا كان الوفر المعلن كاذباً."""
    for bundle in _bundles(client):
        members_total = sum(
            item["product"]["price"] * item["quantity"] for item in bundle["items"]
        )
        assert bundle["compareAtPrice"] == members_total


def test_bundle_localization(client):
    english = _bundles(client)[0]["name"]
    arabic = _bundles(client, "?lang=ar")[0]["name"]
    assert arabic and english
    assert arabic != english


def test_get_bundle_by_slug(client):
    response = client.get("/api/v1/bundles/bright-eye-duo?lang=ar")
    assert response.status_code == 200
    assert response.get_json()["data"]["slug"] == "bright-eye-duo"


def test_get_unknown_bundle_returns_404(client):
    response = client.get("/api/v1/bundles/not-a-bundle")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "bundle_not_found"


def test_bundle_coupon_is_valid_at_members_total(client):
    bundle = _bundles(client)[0]
    response = client.post(
        "/api/v1/coupons/validate",
        json={"code": bundle["couponCode"], "subtotal": bundle["compareAtPrice"]},
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["discountType"] == "fixed"
    assert data["discountAmount"] == bundle["compareAtPrice"] - bundle["price"]


def test_checkout_with_bundle_coupon_charges_the_advertised_price(client):
    """الاختبار الأهم: الطقم كاملاً + كوده = سعر الباقة المعلن بالضبط."""
    bundle = _bundles(client, "?lang=ar")[0]
    items = [{"productId": int(item["productId"]), "quantity": item["quantity"]} for item in bundle["items"]]

    response = client.post(
        "/api/v1/orders/checkout",
        json={
            "email": "routine@example.com",
            "shipping": {
                "firstName": "Nada",
                "lastName": "Ali",
                "phone": "01012345678",
                "address": "15 Pyramid St",
                "city": "Giza",
                "governorate": "Giza",
            },
            "paymentMethod": "cod",
            "couponCode": bundle["couponCode"],
            "items": items,
        },
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["subtotal"] == bundle["compareAtPrice"]
    assert data["discountAmount"] == bundle["compareAtPrice"] - bundle["price"]
    assert data["shippingCost"] == 0.0, "سعر الباقة فوق عتبة الشحن المجاني"
    assert data["total"] == bundle["price"]
    assert data["couponCode"] == bundle["couponCode"]


def test_bundle_coupon_rejects_partial_bundle(client):
    """عضو واحد فقط لا يكفي — كود الباقة يتطلب مجموع أعضائها."""
    bundle = _bundles(client)[0]
    response = client.post(
        "/api/v1/orders/checkout",
        json={
            "email": "partial@example.com",
            "shipping": {
                "firstName": "Nada",
                "lastName": "Ali",
                "phone": "01012345678",
                "address": "15 Pyramid St",
                "city": "Giza",
                "governorate": "Giza",
            },
            "paymentMethod": "cod",
            "couponCode": bundle["couponCode"],
            "items": [{"productId": int(bundle["items"][0]["productId"]), "quantity": 1}],
        },
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "min_spend_not_met"
