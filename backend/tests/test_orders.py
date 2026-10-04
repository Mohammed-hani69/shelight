"""اختبارات الطلبات: إتمام الطلب، الكوبونات، المخزون، وطلبات العميل."""
from __future__ import annotations

from tests.conftest import product_id


def checkout_payload(pid: int, quantity: int = 1, **overrides) -> dict:
    payload = {
        "email": "guest@example.com",
        "shipping": {
            "firstName": "Guest",
            "lastName": "User",
            "phone": "01000000000",
            "address": "12 Nile Street",
            "city": "Cairo",
            "governorate": "Cairo",
        },
        "paymentMethod": "cod",
        "items": [{"productId": pid, "quantity": quantity}],
    }
    payload.update(overrides)
    if payload.get("email") is None:
        payload.pop("email", None)
    return payload


def test_guest_checkout_totals(client):
    pid = product_id(client, "luminous-glow-serum")
    response = client.post("/api/v1/orders/checkout", json=checkout_payload(pid, quantity=2))
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["subtotal"] == 1780.0
    assert data["shippingCost"] == 0.0  # ≥ حد الشحن المجاني
    assert data["discountAmount"] == 0.0
    assert data["total"] == 1780.0
    assert data["status"] == "pending"
    assert data["orderNumber"].startswith("SL-")


def test_guest_checkout_creates_phone_account_and_links_order(client):
    pid = product_id(client, "luminous-glow-serum")
    earlier = client.post(
        "/api/v1/orders/checkout", json=checkout_payload(pid, email=None)
    )
    assert earlier.status_code == 201
    from app.extensions import db
    from app.models import Order

    with client.application.app_context():
        old_order = Order.query.filter_by(
            order_number=earlier.get_json()["data"]["orderNumber"]
        ).one()
        old_order.customer_id = None
        db.session.commit()

    response = client.post(
        "/api/v1/orders/checkout", json=checkout_payload(pid, email=None)
    )
    assert response.status_code == 201
    number = response.get_json()["data"]["orderNumber"]

    login = client.post(
        "/api/v1/auth/login",
        json={"phone": "01000000000", "password": "01000000000"},
    )
    assert login.status_code == 200
    token = login.get_json()["data"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    profile = client.get("/api/v1/profile", headers=headers).get_json()["data"]["customer"]
    assert profile["firstName"] == "Guest"
    assert profile["address"] == "12 Nile Street"
    assert profile["governorate"] == "Cairo"

    orders = client.get("/api/v1/orders", headers=headers).get_json()["data"]
    assert {order["orderNumber"] for order in orders} == {
        number,
        earlier.get_json()["data"]["orderNumber"],
    }


def test_checkout_with_coupon(client):
    pid = product_id(client, "luminous-glow-serum")  # price 890 → subtotal 890 (≥ حد SHELIGHT10)
    response = client.post(
        "/api/v1/orders/checkout",
        json=checkout_payload(pid, couponCode="SHELIGHT10"),
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["subtotal"] == 890.0
    assert data["discountAmount"] == 89.0
    # 890 − 89 خصم 10% + شحن 60 = 861
    assert data["total"] == 861.0
    assert data["couponCode"] == "SHELIGHT10"


def test_checkout_decrements_stock(client):
    pid = product_id(client, "radiant-cream-cleanser")
    before = client.get("/api/v1/products/radiant-cream-cleanser").get_json()["data"]["stock"]
    response = client.post("/api/v1/orders/checkout", json=checkout_payload(pid, quantity=5))
    assert response.status_code == 201
    after = client.get("/api/v1/products/radiant-cream-cleanser").get_json()["data"]["stock"]
    assert after == before - 5


def test_insufficient_stock_rejected(client):
    pid = product_id(client, "velvet-body-oil")  # stock 4
    response = client.post(
        "/api/v1/orders/checkout", json=checkout_payload(pid, quantity=10)
    )
    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "insufficient_stock"


def test_invalid_coupon_rejected(client):
    pid = product_id(client, "dew-drop-toner")
    response = client.post(
        "/api/v1/orders/checkout", json=checkout_payload(pid, couponCode="NOPE")
    )
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "invalid_coupon"


def test_guest_checkout_requires_items(client):
    response = client.post("/api/v1/orders/checkout", json=checkout_payload(0, quantity=0))
    # إما عنصر صغير الكمية (يُرفض) أو لا يوجد منتج — يجب أن يفشل الطلب
    assert response.status_code in (422, 404)


def test_logged_in_checkout_clears_cart(client, auth_headers):
    pid = product_id(client, "eye-bright-cream")
    client.post("/api/v1/cart/items", headers=auth_headers, json={"productId": pid, "quantity": 1})
    payload = checkout_payload(pid, email=None)
    response = client.post("/api/v1/orders/checkout", headers=auth_headers, json=payload)
    assert response.status_code == 201

    cart = client.get("/api/v1/cart", headers=auth_headers).get_json()["data"]
    assert cart["items"] == []


def test_customer_orders_listing(client, auth_headers):
    pid = product_id(client, "dew-drop-toner")
    client.post("/api/v1/orders/checkout", headers=auth_headers, json=checkout_payload(pid))
    listing = client.get("/api/v1/orders", headers=auth_headers)
    assert listing.status_code == 200
    data = listing.get_json()["data"]
    assert len(data) == 1
    assert data[0]["items"]

    detail = client.get(f"/api/v1/orders/{data[0]['orderNumber']}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.get_json()["data"]["orderNumber"] == data[0]["orderNumber"]


def test_order_output_includes_shipping_address(client, auth_headers):
    """واجهة العرض تحتاج عنوان الشحن — يجب أن يصل مع الطلب."""
    pid = product_id(client, "luminous-glow-serum")
    payload = checkout_payload(pid)
    created = client.post("/api/v1/orders/checkout", headers=auth_headers, json=payload)
    order = created.get_json()["data"]
    shipping = order["shipping"]
    assert shipping["firstName"] == "Guest"
    assert shipping["lastName"] == "User"
    assert shipping["phone"] == "01000000000"
    assert shipping["address"] == "12 Nile Street"
    assert shipping["city"] == "Cairo"
    assert shipping["governorate"] == "Cairo"

    fetched = client.get(f"/api/v1/orders/{order['orderNumber']}", headers=auth_headers)
    assert fetched.get_json()["data"]["shipping"] == shipping


def test_order_item_name_follows_lang(client, auth_headers):
    """اسم المنتج في الطلب يتبع اللغة المطلوبة."""
    pid = product_id(client, "luminous-glow-serum")
    created = client.post(
        "/api/v1/orders/checkout", headers=auth_headers, json=checkout_payload(pid)
    )
    order_number = created.get_json()["data"]["orderNumber"]

    en = client.get(f"/api/v1/orders/{order_number}", headers=auth_headers).get_json()["data"]
    ar = client.get(
        f"/api/v1/orders/{order_number}", headers=auth_headers, query_string={"lang": "ar"}
    ).get_json()["data"]

    assert en["items"][0]["name"] == "Luminous Glow Serum"
    assert ar["items"][0]["name"] == "سيروم الإشراقة"


def test_checkout_below_threshold_charges_shipping(client):
    """تحت حد الشحن المجاني تُحتسب رسوم الشحن من نفس الثابت."""
    pid = product_id(client, "nail-strength-elixir")  # 280 → دون الحد
    data = client.post(
        "/api/v1/orders/checkout", json=checkout_payload(pid)
    ).get_json()["data"]
    assert data["subtotal"] < 1500
    assert data["shippingCost"] > 0
    assert data["total"] == round(data["subtotal"] + data["shippingCost"] - data["discountAmount"], 2)


def test_checkout_rejects_flat_shipping_payload(client):
    """الحقول المسطّحة يجب أن تُرفض — العقد يتطلب كائن shipping متداخلاً."""
    pid = product_id(client, "luminous-glow-serum")
    response = client.post(
        "/api/v1/orders/checkout",
        json={
            "fullName": "Guest User",
            "phone": "01000000000",
            "address": "12 Nile Street",
            "city": "Cairo",
            "governorate": "Cairo",
            "paymentMethod": "cod",
            "items": [{"productId": pid, "quantity": 1}],
        },
    )
    assert response.status_code == 422


# ---------------------------------------------------------------
# تتبّع الطلب (زائر بلا حساب): رقم الطلب + رقم الموبايل
# ---------------------------------------------------------------


def test_track_order_is_public_and_returns_safe_fields(client):
    """التتبّع لا يحتاج توكن، ويعيد الحالة فقط دون بيانات شخصية."""
    pid = product_id(client, "luminous-glow-serum")
    created = client.post("/api/v1/orders/checkout", json=checkout_payload(pid))
    number = created.get_json()["data"]["orderNumber"]

    res = client.get(
        f"/api/v1/orders/track/{number}", query_string={"phone": "01000000000"}
    )
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["orderNumber"] == number
    assert data["status"] == "pending"
    assert data["itemCount"] == 1
    assert data["total"] == 950.0  # 890 + 60 شحن
    assert data["city"] == "Cairo"
    # لا مكان للبيانات الحساسة في استجابة عامة
    assert "shipping" not in data
    assert "shippingAddress" not in data
    assert "phone" not in data
    assert "email" not in data


def test_track_order_accepts_international_phone_forms(client):
    """نفس الرقم بصيغة أخرى (+20 / 0020) يجب أن يطابق."""
    pid = product_id(client, "luminous-glow-serum")
    created = client.post(
        "/api/v1/orders/checkout",
        json=checkout_payload(
            pid,
            shipping={
                "firstName": "Guest",
                "lastName": "User",
                "phone": "+201000000000",
                "address": "12 Nile Street",
                "city": "Cairo",
                "governorate": "Cairo",
            },
        ),
    )
    number = created.get_json()["data"]["orderNumber"]

    for variant in ("01000000000", "1000000000", "+201000000000", "00201000000000"):
        res = client.get(
            f"/api/v1/orders/track/{number}", query_string={"phone": variant}
        )
        assert res.status_code == 200, variant


def test_track_order_rejects_wrong_phone(client):
    pid = product_id(client, "luminous-glow-serum")
    created = client.post("/api/v1/orders/checkout", json=checkout_payload(pid))
    number = created.get_json()["data"]["orderNumber"]

    res = client.get(
        f"/api/v1/orders/track/{number}", query_string={"phone": "01199999999"}
    )
    assert res.status_code == 404
    assert res.get_json()["error"]["code"] == "order_not_found"


def test_track_order_unknown_number_is_not_distinguishable(client):
    """رقم غير موجود ورقم موجود بموبايل خطأ يعيدان نفس الرد — لا تسريب وجود."""
    missing = client.get(
        "/api/v1/orders/track/SL-20260101-000000",
        query_string={"phone": "01000000000"},
    )
    assert missing.status_code == 404
    assert missing.get_json()["error"]["code"] == "order_not_found"


def test_track_order_validates_input(client):
    bad_number = client.get(
        "/api/v1/orders/track/NOT-AN-ORDER", query_string={"phone": "01000000000"}
    )
    assert bad_number.status_code == 400
    assert bad_number.get_json()["error"]["code"] == "invalid_order_number"

    pid = product_id(client, "luminous-glow-serum")
    number = (
        client.post("/api/v1/orders/checkout", json=checkout_payload(pid))
        .get_json()["data"]["orderNumber"]
    )
    no_phone = client.get(f"/api/v1/orders/track/{number}")
    assert no_phone.status_code == 400
    assert no_phone.get_json()["error"]["code"] == "phone_required"


def test_track_order_is_case_insensitive(client):
    pid = product_id(client, "luminous-glow-serum")
    number = (
        client.post("/api/v1/orders/checkout", json=checkout_payload(pid))
        .get_json()["data"]["orderNumber"]
    )
    res = client.get(
        f"/api/v1/orders/track/{number.lower()}",
        query_string={"phone": "01000000000"},
    )
    assert res.status_code == 200
    assert res.get_json()["data"]["orderNumber"] == number