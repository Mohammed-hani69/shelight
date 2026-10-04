"""التحقق من هوية طلبات الـ webhook القادمة من Bosta.

الطريقة الرسمية (https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook/):

    "You have the option to add an Authorization Key and assign it a custom
     name. Please note that both the key name and its corresponding value must
     be entered together."

أي أن Bosta **لا ترسل توقيعاً (HMAC) ولا ترويسة signature**: التحقق يتم عبر
زوج (اسم ترويسة، قيمة) يختاره التاجر في لوحة Bosta أو عبر
``webhookCustomHeaders`` عند إنشاء الشحنة، وتعيد Bosta إرساله مع كل طلب.

لذلك نطابق قيمة الترويسة المعرَّفة في الإعدادات بدالة مقارنة ثابتة الزمن
(``hmac.compare_digest``) — ولا نخترع ترويسة توقيع غير موجودة.

قواعد صارمة:
  * لا يوجد سر مُعد => يُرفض الطلب (fail closed). وجود الـ endpoint ليس
    دليلاً على أن المُرسِل هو Bosta.
  * لا يُسجَّل السر ولا قيمة الترويسة في أي log إطلاقاً.
"""
from __future__ import annotations

import hmac
from dataclasses import dataclass

from flask import Request, current_app


@dataclass(frozen=True)
class VerificationResult:
    """نتيجة التحقق: `ok` مع سبب قصير يسمح بالتشخيص بدون كشف أي سر."""

    ok: bool
    reason: str


def _configured_token() -> str | None:
    """قيمة الترويسة السرية كما هي من الإعدادات، أو None إن لم تُضبط."""
    token = (current_app.config.get("BOSTA_WEBHOOK_AUTH_TOKEN") or "").strip()
    return token or None


def _configured_header_name() -> str | None:
    """اسم ترويسة التحقق كما اختاره التاجر في لوحة Bosta، أو None."""
    name = (current_app.config.get("BOSTA_WEBHOOK_AUTH_HEADER") or "").strip()
    return name or None


def _read_header(request: Request, name: str) -> str | None:
    """يقرأ ترويسة بأمان مهما كانت صيغة أحرف اسمها (HTTP headers case-insensitive)."""
    value = request.headers.get(name)
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def verify_webhook_request(request: Request) -> VerificationResult:
    """يتحقق أن الطلب يحمل قيمة الترويسة السرية الصحيحة.

    يرجع ``VerificationResult(ok=False, reason=...)`` مع سبب قابل للتشخيص
    بدون كشف أي سر في الرسالة.

    الأسباب الممكنة:
    - ``not_configured``: لا يوجد سر في الإعدادات. نرفض الطلب لأن قبوله يعني
      أن أي شخص يستطيع تحديث حالات الشحنات.
    - ``missing_token``: الطلب بلا ترويسة التحقق.
    - ``mismatch``: قيمة خاطئة.
    """
    expected = _configured_token()
    if expected is None:
        current_app.logger.error(
            "Bosta webhook rejected - BOSTA_WEBHOOK_AUTH_TOKEN is not configured. "
            "Set it to the same value entered in the Bosta dashboard "
            "(Settings -> API Integration -> Set Up Your Webhook)."
        )
        return VerificationResult(ok=False, reason="not_configured")

    configured_name = _configured_header_name()
    if configured_name is None:
        current_app.logger.error(
            "Bosta webhook rejected - BOSTA_WEBHOOK_AUTH_HEADER is not configured. "
            "It must match the header name set in the Bosta dashboard."
        )
        return VerificationResult(ok=False, reason="not_configured")

    # نقرأ الاسم المُعدّ فقط، بلا أسماء بديلة: Bosta ترسل الترويسة بالاسم
    # الذي يختاره التاجر، وقبول أسماء أخرى = قبول عقد غير موجود.
    provided = _read_header(request, configured_name)

    if provided is None:
        current_app.logger.warning(
            "Bosta webhook rejected - missing verification header (expected name: %s)",
            configured_name,
        )
        return VerificationResult(ok=False, reason="missing_token")

    if not hmac.compare_digest(provided, expected):
        current_app.logger.warning("Bosta webhook rejected - verification header mismatch")
        return VerificationResult(ok=False, reason="mismatch")

    return VerificationResult(ok=True, reason="ok")