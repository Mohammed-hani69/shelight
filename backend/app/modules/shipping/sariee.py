from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.core.errors import ApiError


def _upstream_error_message(error: HTTPError) -> str | None:
    try:
        payload = json.loads(error.read(8192))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None

    if not isinstance(payload, dict):
        return None

    candidates = [payload]
    nested_error = payload.get("error")
    if isinstance(nested_error, dict):
        candidates.append(nested_error)

    for candidate in candidates:
        for key in ("message", "detail", "error_description", "error"):
            value = candidate.get(key)
            if isinstance(value, str) and value.strip():
                return " ".join(value.split())[:300]
    return None


class SarieeClient:
    def __init__(self, *, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def _request(self, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
        request = Request(
            f"{self.base_url}{path}",
            data=json.dumps(body).encode("utf-8") if body is not None else None,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-API-Key": self.api_key,
            },
            method=method,
        )
        try:
            with urlopen(request, timeout=25) as response:
                raw_response = response.read()
        except HTTPError as error:
            detail = _upstream_error_message(error)
            message = f"رفض سريع الطلب (HTTP {error.code})."
            if detail:
                message = f"{message} {detail}"
            else:
                message = f"{message} راجع إعدادات حساب سريع وبيانات الطلب."
            raise ApiError(
                message,
                status_code=502,
                code="sariee_request_failed",
            ) from error
        except (URLError, TimeoutError) as error:
            raise ApiError(
                "تعذّر الاتصال بخادم سريع. حاول مرة أخرى لاحقًا.",
                status_code=502,
                code="sariee_unavailable",
            ) from error
        if not raw_response:
            return {}
        try:
            result = json.loads(raw_response)
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            raise ApiError(
                "أعاد سريع استجابة غير صالحة.",
                status_code=502,
                code="sariee_invalid_response",
            ) from error
        if not isinstance(result, dict):
            raise ApiError(
                "أعاد سريع استجابة غير متوقعة.",
                status_code=502,
                code="sariee_invalid_response",
            )
        return result

    def create_order(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/api/merchant-api/orders", payload)

    def activate_order(self, order_id: str, pickup_location_id: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/api/merchant-api/orders/{quote(order_id, safe='')}/activate",
            {"pickup_location_id": pickup_location_id},
        )


def extract_order_id(response: dict[str, Any]) -> str | None:
    candidates = [response]
    for key in ("data", "order", "result"):
        nested = response.get(key)
        if isinstance(nested, dict):
            candidates.append(nested)
    for candidate in candidates:
        for key in ("id", "order_id", "orderId"):
            value = candidate.get(key)
            if isinstance(value, (str, int)) and not isinstance(value, bool):
                return str(value)
    return None
