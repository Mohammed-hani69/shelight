from __future__ import annotations

import os
from typing import Any


class BostaClient:
    """مستوى الـ HTTP الخاص بـ Bosta.

    لا نكتشف أو نختلق endpoints هنا؛ هذا الكلاس جاهز لاستقبال وثائق Bosta
    الحقيقية مع الحفاظ على الواجهة نفسها ثابتة.
    """

    def __init__(self, credentials: dict[str, Any] | None = None):
        self.credentials = credentials or {}
        self.base_url = (self.credentials.get("apiUrl") or os.getenv("BOSTA_API_URL", "")).rstrip("/")
        self.api_key = self.credentials.get("apiKey") or self.credentials.get("api_key")
        self.client_id = self.credentials.get("clientId") or self.credentials.get("client_id")
        self.secret = self.credentials.get("secret") or self.credentials.get("secret_key")

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if self.client_id:
            headers["X-Client-Id"] = str(self.client_id)
        return headers

    def test_connection(self) -> dict[str, Any]:
        if not self.base_url:
            return {
                "ok": False,
                "status": "not_configured",
                "message": "Bosta API URL is not configured.",
            }
        if not self.api_key and not self.client_id and not self.secret:
            return {
                "ok": False,
                "status": "missing_credentials",
                "message": "Bosta credentials are missing.",
            }

        # TODO: Replace with the actual Bosta health/check endpoint and payload.
        return {
            "ok": True,
            "status": "configured",
            "message": "Bosta connection is configured and ready for the real API verification.",
            "provider": "bosta",
        }

    def create_shipment(self, payload: dict[str, Any]) -> dict[str, Any]:
        # TODO: replace with the actual Bosta create-shipment endpoint.
        return {
            "ok": True,
            "status": "pending",
            "provider": "bosta",
            "shipment": payload,
            "message": "TODO: implement actual create shipment call after Bosta API docs are provided.",
        }

    def get_shipment(self, shipment_id: str | int) -> dict[str, Any]:
        # TODO: replace with the actual Bosta lookup endpoint.
        return {
            "ok": True,
            "provider": "bosta",
            "shipmentId": shipment_id,
            "status": "pending",
            "message": "TODO: implement actual shipment lookup after Bosta API docs are supplied.",
        }

    def track_shipment(self, tracking_number: str) -> dict[str, Any]:
        # TODO: replace with the actual Bosta tracking endpoint.
        return {
            "ok": True,
            "provider": "bosta",
            "trackingNumber": tracking_number,
            "status": "pending",
            "message": "TODO: implement actual Bosta tracking call after API docs are supplied.",
        }

    def cancel_shipment(self, shipment_id: str | int) -> dict[str, Any]:
        # TODO: replace with the actual Bosta cancel endpoint.
        return {
            "ok": True,
            "provider": "bosta",
            "shipmentId": shipment_id,
            "status": "cancelled",
            "message": "TODO: implement actual cancellation flow after Bosta API docs are supplied.",
        }
