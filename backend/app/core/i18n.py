"""اختيار لغة الإخراج في الـ API.

الواجهة عربية كأولوية، لكن الإبقاء على الإنجليزية كلغة افتراضية
يحافظ على توافق أي عميل لا يرسل `lang` أصلاً.
"""
from __future__ import annotations

DEFAULT_LANG = "en"
SUPPORTED_LANGS = ("en", "ar")


def normalize_lang(value: str | None) -> str:
    """يطبّع قيمة `lang` إلى لغة مدعومة، ويرجع للإنجليزية عند غيرها."""
    if not value:
        return DEFAULT_LANG
    candidate = value.strip().lower()[:2]
    return candidate if candidate in SUPPORTED_LANGS else DEFAULT_LANG


def lang_from_args(args) -> str:
    """يقرأ `lang` من وسائط الطلب (query string)."""
    return normalize_lang(args.get("lang"))


def localized(obj, field: str, lang: str = DEFAULT_LANG) -> str | None:
    """يقرأ `<field>_<lang>` ويرجع للغة الأخرى عند غياب القيمة."""
    order = (lang, DEFAULT_LANG) if lang != DEFAULT_LANG else (DEFAULT_LANG, lang)
    for candidate in order:
        value = getattr(obj, f"{field}_{candidate}", None)
        if value:
            return value
    return None
