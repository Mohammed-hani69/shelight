from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class ShippingProvider(ABC):
    """واجهة عامة لكل مزوّد شحن.

    تُوسّع الفئات لاحقاً لتضمّن Aramex / DHL / Mylerz بدون إحداث تغييرات
    في منطق الطلبات أو لوحة التحكم.
    """

    provider_name = "generic"

    def __init__(self, settings: dict[str, Any] | None = None):
        self.settings = settings or {}

    @property
    def is_enabled(self) -> bool:
        return bool(self.settings.get("enabled"))

    @abstractmethod
    def test_connection(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def create_shipment(self, order: Any, **kwargs) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def get_shipment(self, shipment_id: str | int, **kwargs) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def track_shipment(self, tracking_number: str, **kwargs) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def cancel_shipment(self, shipment_id: str | int, **kwargs) -> dict[str, Any]:
        raise NotImplementedError
