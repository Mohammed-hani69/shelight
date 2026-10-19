from __future__ import annotations

from typing import Any

from app.core.constants import FREE_SHIPPING_THRESHOLD, SHIPPING_COST
from app.extensions import db
from app.models import StorefrontSection

GOVERNORATE_KEYS = (
    "cairo", "alexandria", "portSaid", "suez", "damietta", "dakahlia", "sharqia",
    "qalyubia", "kafrElSheikh", "gharbia", "monufia", "beheira", "ismailia", "giza",
    "beniSuef", "fayoum", "minya", "asyut", "sohag", "qena", "luxor", "aswan",
    "redSea", "newValley", "matrouh", "northSinai", "southSinai",
)
SOCIAL_KEYS = ("facebook", "instagram", "tiktok")
SETTINGS_KEY = "store_settings"


def default_store_settings() -> dict[str, Any]:
    return {
        "defaultShippingFee": SHIPPING_COST,
        "governorateFees": {key: SHIPPING_COST for key in GOVERNORATE_KEYS},
        "freeShippingThreshold": FREE_SHIPPING_THRESHOLD,
        "announcementAr": "شحن مجاني للطلبات فوق {threshold}",
        "announcementEn": "Free shipping over {threshold}",
        "whatsappPhone": "",
        "socialLinks": {key: "" for key in SOCIAL_KEYS},
        "onlinePaymentInfo": "سيتم إرسال تفاصيل الدفع الإلكتروني بعد تأكيد الطلب.",
        "onlinePaymentDiscountEnabled": False,
        "onlinePaymentDiscountPercent": 0,
    }


def normalize_social_links(raw: dict[str, Any] | None) -> dict[str, str]:
    """يرجّع روابط التواصل منظّفة: نصّ فارغ أو رابط يبدأ بـ http(s).

    المدير قد يكتب `facebook.com/page` بلا بروتوكول؛ نضيف `https://`
    حتى لا يتحول الرابط في الفوتر إلى مسار نسبي داخل الموقع.
    """
    links: dict[str, str] = {}
    for key in SOCIAL_KEYS:
        value = ""
        if isinstance(raw, dict):
            candidate = raw.get(key)
            if isinstance(candidate, str):
                value = candidate.strip()
        if value and not value.startswith(("http://", "https://")):
            value = f"https://{value.lstrip('/')}"
        links[key] = value
    return links


def get_store_settings() -> dict[str, Any]:
    defaults = default_store_settings()
    section = StorefrontSection.query.filter_by(section_key=SETTINGS_KEY).first()
    content = section.content if section and isinstance(section.content, dict) else {}
    try:
        default_fee = max(0, float(content.get("defaultShippingFee", defaults["defaultShippingFee"])))
    except (TypeError, ValueError):
        default_fee = defaults["defaultShippingFee"]
    fees = {key: default_fee for key in GOVERNORATE_KEYS}
    saved_fees = content.get("governorateFees", {})
    if isinstance(saved_fees, dict):
        for key in GOVERNORATE_KEYS:
            try:
                fees[key] = max(0, float(saved_fees.get(key, default_fee)))
            except (TypeError, ValueError):
                continue
    try:
        threshold = max(0, float(content.get("freeShippingThreshold", defaults["freeShippingThreshold"])))
    except (TypeError, ValueError):
        threshold = defaults["freeShippingThreshold"]
    return {
        "defaultShippingFee": default_fee,
        "governorateFees": fees,
        "freeShippingThreshold": threshold,
        "announcementAr": str(content.get("announcementAr") or defaults["announcementAr"]),
        "announcementEn": str(content.get("announcementEn") or defaults["announcementEn"]),
        "whatsappPhone": str(content.get("whatsappPhone") or ""),
        "socialLinks": normalize_social_links(content.get("socialLinks")),
        "onlinePaymentInfo": str(content.get("onlinePaymentInfo", defaults["onlinePaymentInfo"])),
        "onlinePaymentDiscountEnabled": bool(content.get("onlinePaymentDiscountEnabled", False)),
        "onlinePaymentDiscountPercent": _online_payment_discount_percent(
            content.get("onlinePaymentDiscountPercent", defaults["onlinePaymentDiscountPercent"])
        ),
    }


def _online_payment_discount_percent(value: Any) -> float:
    try:
        return min(100, max(0, float(value)))
    except (TypeError, ValueError):
        return 0


def save_store_settings(content: dict[str, Any]) -> dict[str, Any]:
    section = StorefrontSection.query.filter_by(section_key=SETTINGS_KEY).first()
    if section is None:
        section = StorefrontSection(section_key=SETTINGS_KEY, section_type="store_settings")
    section.is_active = True
    section.content = content
    db.session.add(section)
    db.session.commit()
    return get_store_settings()