from __future__ import annotations

from decimal import Decimal

from app.extensions import db
from app.models import Order


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    access_token = response.get_json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {access_token}"}


def _add_order(
    order_number: str,
    *,
    payment_method: str,
    payment_status: str,
    total: str,
    provider: str | None = None,
    status: str = "delivered",
) -> None:
    db.session.add(
        Order(
            order_number=order_number,
            status=status,
            subtotal=Decimal(total),
            shipping_cost=Decimal("0"),
            discount_amount=Decimal("0"),
            total=Decimal(total),
            payment_method=payment_method,
            payment_status=payment_status,
            shipping_provider=provider,
            shipping_first_name="Test",
            shipping_last_name="Customer",
            shipping_phone="01000000000",
            shipping_address="12 Test Street",
            shipping_city="Cairo",
            shipping_governorate="Cairo",
        )
    )


def test_accounting_separates_online_payments_and_sariee_cod(client, app):
    with app.app_context():
        _add_order("SL-ACCOUNT-ONLINE-PAID", payment_method="card", payment_status="paid", total="1000")
        _add_order("SL-ACCOUNT-ONLINE-PENDING", payment_method="card", payment_status="pending", total="200")
        _add_order("SL-ACCOUNT-ONLINE-REFUNDED", payment_method="card", payment_status="refunded", total="50")
        _add_order(
            "SL-ACCOUNT-COD-SARIEE",
            payment_method="cod",
            payment_status="pending",
            total="500",
            provider="sariee",
        )
        _add_order(
            "SL-ACCOUNT-COD-NO-SARIEE",
            payment_method="cod",
            payment_status="pending",
            total="300",
        )
        _add_order(
            "SL-ACCOUNT-COD-PAID",
            payment_method="cod",
            payment_status="paid",
            total="700",
            provider="sariee",
        )
        _add_order(
            "SL-ACCOUNT-NOT-DELIVERED",
            payment_method="cod",
            payment_status="pending",
            total="900",
            provider="sariee",
            status="shipped",
        )
        db.session.commit()

    response = client.get("/api/v1/admin/accounting", headers=_admin_headers(client))
    assert response.status_code == 200
    summary = response.get_json()["data"]["summary"]
    payments = summary["payments"]

    assert summary["deliveredOrders"] == 6
    assert payments == {
        "onlinePaidAmount": 1000.0,
        "onlinePaidOrders": 1,
        "onlinePendingAmount": 200.0,
        "onlinePendingOrders": 1,
        "onlineRefundedAmount": 50.0,
        "onlineRefundedOrders": 1,
        "sarieeCodAmount": 500.0,
        "sarieeCodOrders": 1,
        "otherCodPendingAmount": 300.0,
        "otherCodPendingOrders": 1,
        "codPaidAmount": 700.0,
        "codPaidOrders": 1,
    }
