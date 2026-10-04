"""اختبارات إدارة الباقات (الطقوس الجاهزة) من لوحة التحكم + سير الشراء."""
from __future__ import annotations

from app.models import Coupon


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def _bundle_coupon(client, code):
    with client.application.app_context():
        return Coupon.query.filter_by(code=code).first()


def _product_slugs(client):
    """أول منتجين نشطين لإسنادهما لعضوين في الباقة."""
    response = client.get("/api/v1/products")
    products = response.get_json()["data"]
    assert len(products) >= 2
    return [
        {"productSlug": products[0]["slug"], "quantity": 1},
        {"productSlug": products[1]["slug"], "quantity": 2},
    ]


def test_admin_list_bundles(client):
    headers = _admin_headers(client)
    response = client.get("/api/v1/admin/bundles", headers=headers)
    assert response.status_code == 200
    bundles = response.get_json()["data"]
    assert bundles
    bundle = bundles[0]
    assert bundle["slug"] and bundle["nameEn"]
    assert bundle["price"] > 0
    assert bundle["compareAtPrice"] >= bundle["price"]
    assert bundle["couponCode"]
    assert bundle["items"] or bundle["itemCount"] >= 0


def test_admin_create_bundle_syncs_coupon_and_price(client):
    headers = _admin_headers(client)
    items = _product_slugs(client)

    created = client.post(
        "/api/v1/admin/bundles",
        headers=headers,
        json={
            "slug": "morning-routine",
            "nameAr": "روتين الصباح",
            "nameEn": "Morning Routine",
            "descriptionAr": "روتين كامل لبشرتك",
            "descriptionEn": "A complete routine",
            "badgeAr": "الأكثر مبيعاً",
            "badgeEn": "Best Seller",
            "price": "299.00",
            "isActive": True,
            "sortOrder": 1,
            "items": items,
        },
    )
    assert created.status_code == 201
    data = created.get_json()["data"]
    assert data["slug"] == "morning-routine"
    assert len(data["items"]) == 2
    assert data["items"][0]["quantity"] == 1
    assert data["items"][1]["quantity"] == 2
    assert data["compareAtPrice"] == data["membersTotal"]
    assert data["savings"] == round(data["membersTotal"] - data["price"], 2)
    assert data["savings"] > 0

    coupon = _bundle_coupon(client, data["couponCode"])
    assert coupon is not None
    assert coupon.is_active is True
    assert coupon.min_spend == data["membersTotal"]
    assert coupon.value == data["savings"]


def test_admin_bundle_price_is_paid_at_checkout(client):
    """العميل يدفع سعر الباقة المعلن عند الطلب بكوبونها."""
    headers = _admin_headers(client)

    product_response = client.get("/api/v1/products")
    products = product_response.get_json()["data"]
    first, second = products[0], products[1]
    member_total = round((first["price"] * 1) + (second["price"] * 2), 2)
    bundle_price = 299.0

    created = client.post(
        "/api/v1/admin/bundles",
        headers=headers,
        json={
            "slug": "checkout-bundle",
            "nameAr": "باقة تجارب",
            "nameEn": "Checkout Bundle",
            "price": "299.00",
            "items": [
                {"productSlug": first["slug"], "quantity": 1},
                {"productSlug": second["slug"], "quantity": 2},
            ],
        },
    )
    bundle = created.get_json()["data"]
    assert bundle["membersTotal"] == member_total

    order = client.post(
        "/api/v1/orders/checkout",
        json={
            "email": "bundle-buyer@example.com",
            "items": [
                {"productId": first["id"], "quantity": 1},
                {"productId": second["id"], "quantity": 2},
            ],
            "couponCode": bundle["couponCode"],
            "shipping": {
                "firstName": "محمد",
                "lastName": "علي",
                "phone": "01012345678",
                "address": "شارع منى، المعادي",
                "city": "القاهرة",
                "governorate": "القاهرة",
            },
            "paymentMethod": "cod",
        },
    )
    assert order.status_code == 201, order.get_data(as_text=True)
    order_data = order.get_json()["data"]
    assert order_data["subtotal"] == member_total
    assert order_data["discountAmount"] == round(member_total - bundle_price, 2)
    assert order_data["total"] == bundle_price + order_data["shippingCost"]


def test_admin_update_bundle_recomputes_price_and_coupon(client):
    headers = _admin_headers(client)
    items = _product_slugs(client)

    created = client.post(
        "/api/v1/admin/bundles",
        headers=headers,
        json={"slug": "update-bundle", "nameEn": "Update Bundle", "price": "150.00", "items": items},
    )
    bundle_id = int(created.get_json()["data"]["id"])
    first_code = created.get_json()["data"]["couponCode"]
    assert first_code

    # تغيير السعر والتأكد من تحديث الكوبون لا إنشاء واحد جديد.
    updated = client.put(
        f"/api/v1/admin/bundles/{bundle_id}",
        headers=headers,
        json={
            "slug": "update-bundle",
            "nameEn": "Update Bundle V2",
            "nameAr": "باقة محدثة",
            "price": "120.00",
            "isActive": True,
            "items": items,
        },
    )
    assert updated.status_code == 200
    data = updated.get_json()["data"]
    assert data["nameEn"] == "Update Bundle V2"
    assert data["couponCode"] == first_code
    coupon = _bundle_coupon(client, first_code)
    assert coupon.value == round(data["membersTotal"] - 120.00, 2)
    assert coupon.is_active is True


def test_admin_patch_bundle_hides_then_public_list(client):
    headers = _admin_headers(client)
    items = _product_slugs(client)

    created = client.post(
        "/api/v1/admin/bundles",
        headers=headers,
        json={"slug": "hide-bundle", "nameEn": "Hide Bundle", "price": "90.00", "items": items},
    )
    bundle_id = int(created.get_json()["data"]["id"])
    coupon_code = created.get_json()["data"]["couponCode"]

    hidden = client.patch(
        f"/api/v1/admin/bundles/{bundle_id}",
        headers=headers,
        json={"isActive": False},
    )
    assert hidden.status_code == 200
    assert hidden.get_json()["data"]["isActive"] is False

    coupon = _bundle_coupon(client, coupon_code)
    assert coupon.is_active is False

    public = client.get("/api/v1/bundles")
    slugs = [b["slug"] for b in public.get_json()["data"]]
    assert "hide-bundle" not in slugs


def test_admin_delete_bundle_soft_and_coupon_disabled(client):
    headers = _admin_headers(client)
    items = _product_slugs(client)

    created = client.post(
        "/api/v1/admin/bundles",
        headers=headers,
        json={"slug": "delete-bundle", "nameEn": "Delete Bundle", "price": "80.00", "items": items},
    )
    bundle_id = int(created.get_json()["data"]["id"])
    coupon_code = created.get_json()["data"]["couponCode"]

    deleted = client.delete(f"/api/v1/admin/bundles/{bundle_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.get_json()["data"]["isActive"] is False

    coupon = _bundle_coupon(client, coupon_code)
    assert coupon.is_active is False

    still_listed = client.get("/api/v1/admin/bundles", headers=headers)
    admin_bundle = next(
        b for b in still_listed.get_json()["data"] if b["id"] == str(bundle_id)
    )
    assert admin_bundle["isActive"] is False