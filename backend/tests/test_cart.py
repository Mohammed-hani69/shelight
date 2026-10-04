"""اختبارات السلة — تتطلب توكن دخول وتحترم حدود المخزون."""
from __future__ import annotations

from tests.conftest import product_id


def test_cart_requires_auth(client):
    assert client.get("/api/v1/cart").status_code == 401


def test_add_list_update_remove(client, auth_headers):
    pid = product_id(client, "luminous-glow-serum")

    add = client.post("/api/v1/cart/items", headers=auth_headers, json={"productId": pid, "quantity": 2})
    assert add.status_code == 200
    cart = add.get_json()["data"]
    assert len(cart["items"]) == 1
    assert cart["items"][0]["quantity"] == 2
    assert cart["items"][0]["name"] == "Luminous Glow Serum"

    # مجموع 890*2 = 1780 ≥ حد الشحن المجاني → الشحن صفر
    assert cart["subtotal"] == 1780.0
    assert cart["shipping"] == 0.0
    assert cart["total"] == 1780.0

    item_id = cart["items"][0]["id"]

    updated = client.patch(
        f"/api/v1/cart/items/{item_id}", headers=auth_headers, json={"quantity": 1}
    )
    assert updated.get_json()["data"]["items"][0]["quantity"] == 1

    removed = client.delete(f"/api/v1/cart/items/{item_id}", headers=auth_headers)
    assert removed.get_json()["data"]["items"] == []


def test_cart_caps_quantity_by_stock(client, auth_headers):
    pid = product_id(client, "nail-strength-elixir")  # stock 45
    client.post("/api/v1/cart/items", headers=auth_headers, json={"productId": pid, "quantity": 2})
    # 2 + 98 = 100 مطلوب لكن المخزون 45 → تُخفَّض الكمية للحد الأقصى
    cart = client.post(
        "/api/v1/cart/items", headers=auth_headers, json={"productId": pid, "quantity": 98}
    ).get_json()["data"]
    assert cart["items"][0]["quantity"] == 45


def test_out_of_stock_product_rejected(client, auth_headers):
    response = client.post(
        "/api/v1/cart/items", headers=auth_headers, json={"productId": 999999, "quantity": 1}
    )
    assert response.status_code == 404


def test_cart_charges_shipping_below_threshold(client, auth_headers):
    """تحت حد الشحن المجاني يُحتسب الشحن — نفس قاعدة الطلبات."""
    pid = product_id(client, "nail-strength-elixir")
    cart = client.post(
        "/api/v1/cart/items", headers=auth_headers, json={"productId": pid, "quantity": 1}
    ).get_json()["data"]
    assert cart["subtotal"] < cart["freeShippingThreshold"]
    assert cart["shipping"] > 0
    assert cart["total"] == round(cart["subtotal"] + cart["shipping"], 2)


def test_cart_uses_arabic_name_when_lang_requested(client, auth_headers):
    """`?lang=ar` يجب أن يعيد الاسم العربي داخل السلة أيضاً."""
    pid = product_id(client, "luminous-glow-serum")
    client.post("/api/v1/cart/items", headers=auth_headers, json={"productId": pid, "quantity": 1})
    en = client.get("/api/v1/cart", headers=auth_headers).get_json()["data"]["items"][0]["name"]
    ar = client.get("/api/v1/cart?lang=ar", headers=auth_headers).get_json()["data"]["items"][0]["name"]
    assert en == "Luminous Glow Serum"
    assert ar != en
    assert "سيروم" in ar