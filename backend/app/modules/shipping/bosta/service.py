from __future__ import annotations

from typing import Any

from app.modules.shipping.base import ShippingProvider
from app.modules.shipping.bosta.client import BostaClient
from app.modules.shipping.bosta.states import (
    BOSTA_STATE_TABLE,
    map_bosta_state,
    normalize_state_code,
    normalize_type,
    state_name,
)

__all__ = [
    "BOSTA_STATE_TABLE",
    "BostaProvider",
    "map_bosta_state",
    "map_bosta_status",
    "normalize_state_code",
    "normalize_type",
    "state_name",
]


def map_bosta_status(value: Any, shipment_type: Any = None) -> str | None:
    """غلاف مختصر ومتوافق مع الكود القديم: يحوّل `state` إلى حالتنا الداخلية.

    يستقبل نصاً أو رقماً لأن `state` في الوثيقة Number لكن بعض النسخ ترسله
    نصياً. يرجع None عند كود مجهول — لا تخمين.

    (الدالة كانت تُعيد "pending" افتراضياً، وتخزّن أي نص مجهول كما هو في
    `Order.shipping_status`. السلوك الجديد يرفض المعنى المجهول.)

    تنبيه: بلا `shipment_type` يعود الكود 41 إلى المحايد `picked_up` لأن
    معناه مرهون بنوع الشحنة. مرّر `shipment_type` من حمولة Bosta إن كان متاحاً.
    """
    return map_bosta_state(normalize_state_code(value), normalize_type(shipment_type))


class BostaProvider(ShippingProvider):
    provider_name = "bosta"

    def __init__(self, settings: dict[str, Any] | None = None):
        super().__init__(settings)
        self.client = BostaClient(self.settings)

    def test_connection(self) -> dict[str, Any]:
        return self.client.test_connection()

    def create_shipment(self, order: Any, **kwargs) -> dict[str, Any]:
        payload = {
            "orderNumber": getattr(order, "order_number", None),
            "customer": {
                "firstName": getattr(order, "shipping_first_name", ""),
                "lastName": getattr(order, "shipping_last_name", ""),
                "phone": getattr(order, "shipping_phone", ""),
                "email": getattr(order, "guest_email", None),
            },
            "address": {
                "city": getattr(order, "shipping_city", ""),
                "governorate": getattr(order, "shipping_governorate", ""),
                "address": getattr(order, "shipping_address", ""),
            },
        }
        return self.client.create_shipment(payload)

    def get_shipment(self, shipment_id: str | int, **kwargs) -> dict[str, Any]:
        return self.client.get_shipment(shipment_id)

    def track_shipment(self, tracking_number: str, **kwargs) -> dict[str, Any]:
        return self.client.track_shipment(tracking_number)

    def cancel_shipment(self, shipment_id: str | int, **kwargs) -> dict[str, Any]:
        return self.client.cancel_shipment(shipment_id)
