"""أدوات مشتركة: زمن UTC وقيم التواريخ."""
from __future__ import annotations

from datetime import datetime, timezone


def utcnow() -> datetime:
    """زمن UTC بدون منطقة زمنية — متوافق مع SQLite والاسترجاع ضمن JSON."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_phone(raw: str | None) -> str:
    """يوحّد صيغة رقم الموبايل للمقارنة فقط (لا يُستخدم للتخزين).

    يقبل `+201001234567` و`00201001234567` و`01001234567` و`1001234567`
    ويخرج من كل صيغة الرقم المحلي `1001234567`.
    """
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    for prefix in ("0020", "20"):
        if digits.startswith(prefix):
            digits = digits[len(prefix) :]
            break
    if digits.startswith("0"):
        digits = digits[1:]
    return digits