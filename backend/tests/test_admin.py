"""اختبارات لوحة التحكم: دخول المدير، الحماية، CRUD المنتجات والطلبات والكوبونات."""
from __future__ import annotations


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


def _buyer_headers(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "notadmin@example.com", "password": "password123", "firstName": "Nour"},
    )
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "notadmin@example.com", "password": "password123"},
    ).get_json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_login_requires_admin_role(client):
    buyer = _buyer_headers(client).get("Authorization").removeprefix("Bearer ")
    # كلمة مرور صحيحة لكن حساب عادي → ممنوع
    denied = client.post(
        "/api/v1/admin/login",
        json={"email": "notadmin@example.com", "password": "password123"},
    )
    assert denied.status_code == 403
    assert denied.get_json()["error"]["code"] == "forbidden"


def test_admin_endpoints_block_non_admins(client):
    headers = _buyer_headers(client)
    response = client.get("/api/v1/admin/dashboard", headers=headers)
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "forbidden"


def test_dashboard_summary(client):
    headers = _admin_headers(client)
    response = client.get("/api/v1/admin/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["productsCount"] >= 9
    assert data["customersCount"] >= 2
    assert "ordersCount" in data
    assert "revenue" in data
    assert "lowStockCount" in data


def test_create_and_update_product(client):
    headers = _admin_headers(client)
    payload = {
        "slug": "admin-test-product",
        "sku": "SL-ADMIN-01",
        "name_en": "Admin Test Product",
        "name_ar": "منتج تجريبي للمدير",
        "price": "250.00",
        "compare_at_price": "300.00",
        "stock": 10,
        "tags": ["test", "admin"],
        "category_slug": "skin-care",
        "concerns": ["glow"],
        "images": [{"url": "https://images.unsplash.com/photo-test", "alt_en": "Test image"}],
        "isFeatured": False,
        "isActive": True,
    }
    created = client.post("/api/v1/admin/products", headers=headers, json=payload)
    assert created.status_code == 201
    data = created.get_json()["data"]
    assert data["slug"] == "admin-test-product"
    assert data["price"] == 250.0
    assert data["category"]["slug"] == "skin-care"
    assert data["concerns"][0]["slug"] == "glow"
    product_id = int(data["id"])

    updated = client.put(
        f"/api/v1/admin/products/{product_id}",
        headers=headers,
        json={**payload, "name_en": "Admin Test Product Updated", "price": "275.00"},
    )
    assert updated.status_code == 200
    assert updated.get_json()["data"]["name"] == "Admin Test Product Updated"
    assert updated.get_json()["data"]["price"] == 275.0

    # يظهر ضمن قائمة admin
    listing = client.get("/api/v1/admin/products", headers=headers)
    slugs = [item["slug"] for item in listing.get_json()["data"]]
    assert "admin-test-product" in slugs


def test_duplicate_product_slug_rejected(client):
    headers = _admin_headers(client)
    payload = {
        "slug": "luminous-glow-serum",
        "sku": "SL-DUP-99",
        "name_en": "Duplicate",
        "price": "100.00",
    }
    response = client.post("/api/v1/admin/products", headers=headers, json=payload)
    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "slug_taken"


def test_soft_delete_product(client):
    headers = _admin_headers(client)
    payload = {
        "slug": "to-hide-product",
        "sku": "SL-HIDE-01",
        "name_en": "To Hide",
        "price": "100.00",
    }
    created = client.post("/api/v1/admin/products", headers=headers, json=payload)
    product_id = int(created.get_json()["data"]["id"])

    deleted = client.delete(f"/api/v1/admin/products/{product_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.get_json()["data"]["isActive"] is False

    # لم يعد يظهر في واجهة المتجر
    store = client.get("/api/v1/products")
    assert all(item["slug"] != "to-hide-product" for item in store.get_json()["data"])


def test_order_status_update(client):
    headers = _admin_headers(client)
    pid = int(client.get("/api/v1/products/dew-drop-toner").get_json()["data"]["id"])
    order = client.post(
        "/api/v1/orders/checkout",
        json={
            "shipping": {
                "firstName": "Guest",
                "phone": "01000000000",
                "address": "12 Nile Street",
                "city": "Cairo",
                "governorate": "Cairo",
            },
            "paymentMethod": "cod",
            "items": [{"productId": pid, "quantity": 1}],
        },
    ).get_json()["data"]
    order_number = order["orderNumber"]

    updated = client.patch(
        f"/api/v1/admin/orders/{order_number}",
        headers=headers,
        json={"status": "shipped", "paymentStatus": "paid"},
    )
    assert updated.status_code == 200
    data = updated.get_json()["data"]
    assert data["status"] == "shipped"
    assert data["paymentStatus"] == "paid"

    listing = client.get("/api/v1/admin/orders", headers=headers)
    assert any(item["orderNumber"] == order_number for item in listing.get_json()["data"])


def test_coupon_crud_and_validation(client):
    headers = _admin_headers(client)
    created = client.post(
        "/api/v1/admin/coupons",
        headers=headers,
        json={"code": "SUMMER20", "discountType": "percent", "value": "20.00", "minSpend": "500.00"},
    )
    assert created.status_code == 201
    coupon_id = int(created.get_json()["data"]["id"])
    assert created.get_json()["data"]["code"] == "SUMMER20"

    # يصبح الرمز صالحاً في متجر العملاء فوراً
    validate = client.post("/api/v1/coupons/validate", json={"code": "SUMMER20", "subtotal": 1000})
    assert validate.get_json()["data"]["discountAmount"] == 200.0

    updated = client.patch(
        f"/api/v1/admin/coupons/{coupon_id}",
        headers=headers,
        json={"code": "SUMMER25", "value": "25.00"},
    )
    assert updated.get_json()["data"]["code"] == "SUMMER25"

    deleted = client.delete(f"/api/v1/admin/coupons/{coupon_id}", headers=headers)
    assert deleted.status_code == 200
    after = client.post("/api/v1/coupons/validate", json={"code": "SUMMER25", "subtotal": 1000})
    assert after.status_code == 404


def test_customers_list_and_toggle(client):
    headers = _admin_headers(client)
    listing = client.get("/api/v1/admin/customers", headers=headers)
    assert listing.status_code == 200
    buyers = [c for c in listing.get_json()["data"] if not c["isAdmin"]]
    assert buyers
    target = buyers[0]

    toggled = client.patch(
        f"/api/v1/admin/customers/{target['id']}", headers=headers, json={"isActive": False}
    )
    assert toggled.status_code == 200
    assert toggled.get_json()["data"]["isActive"] is False