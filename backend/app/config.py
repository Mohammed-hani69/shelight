"""إعدادات التطبيق — فئات لكل بيئة (development / production / testing).

القيم السريّة تُقرأ من متغيرات البيئة ولا تُكتب أبداً داخل الكود.
"""
from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _sqlite_path(filename: str) -> str:
    return f"sqlite:///{BASE_DIR / filename}"


class Config:
    """الإعدادات المشتركة بين البيئات جميعها."""

    SECRET_KEY = os.getenv("SECRET_KEY", "shelight-dev-secret-key-0123456789")
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY", "shelight-dev-jwt-secret-key-0123456789"
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_ACCESS_HOURS", "12")))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        hours=int(os.getenv("JWT_REFRESH_HOURS", "72"))
    )
    JWT_ALGORITHM = "HS256"
    BOSTA_API_URL = os.getenv("BOSTA_API_URL", "").rstrip("/")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # بعد الـ commit تبقى الكائنات صالحة للقراءة، فلا يعيد كل استعلام
    # بناء تحميل ما بعد الحفظ.
    SQLALCHEMY_EXPIRE_ON_COMMIT = False
    # أجسام الطلبات من مستخدم خارجي: سقف صغير يمنع استنزاف الذاكرة
    # بهجوم جسم ضخم، ويحوّل الرمي إلى 413 بدل 500.
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(64 * 1024)))
    # localhost و 127.0.0.1 أصلان مختلفان للمتصفح، لذا يجب ذكرهما معاً وإلا
    # رُفضت طلبات preflight القادمة من 127.0.0.1.
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
        if origin.strip()
    ]
    # --- Webhooks مزوّدي الشحن -------------------------------------------
    # Bosta لا ترسل توقيعاً (HMAC): التحقق يتم عبر ترويسة مخصّصة يختار
    # التاجر اسمها وقيمتها في لوحة Bosta (Settings -> API Integration ->
    # Set Up Your Webhook) أو عبر `webhookCustomHeaders` عند إنشاء الشحنة.
    #   https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook/
    # قيمتها مطلوبة: بدونها يُرفض كل طلب (fail closed) ولا يُقبل أن يكون
    # مجرد الوصول إلى الـ endpoint دليلاً على أن المُرسِل هو Bosta.
    BOSTA_WEBHOOK_AUTH_TOKEN = os.getenv("BOSTA_WEBHOOK_AUTH_TOKEN", "").strip()
    # اسم الترويسة كما سُجّل في لوحة Bosta (قيمة مقترحة فقط، وليست عقداً
    # من Bosta): يجب أن يطابق الاسم المُدخل في اللوحة حرفياً، ولا تُقبل
    # أسماء بديلة إن اختلفت.
    BOSTA_WEBHOOK_AUTH_HEADER = os.getenv(
        "BOSTA_WEBHOOK_AUTH_HEADER", "X-Bosta-Webhook-Token"
    ).strip()
    PAGINATION_PAGE_SIZE = int(os.getenv("PAGINATION_PAGE_SIZE", "12"))
    # سقف لعناصر السلة والمفضلة حتى لا تُحمَّل مجموعات غير محدودة.
    MAX_COLLECTION_ITEMS = int(os.getenv("MAX_COLLECTION_ITEMS", "100"))
    # تتبّع رحلة العميل (First-Party): يمكن إيقافه بالكامل عبر البيئة.
    TRACKING_ENABLED = os.getenv("TRACKING_ENABLED", "true").lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    # سلة تُعدّ «متروكة» إذا مرّت هذه المدة بلا نشاط وهي ما زالت ACTIVE.
    ABANDONED_CART_THRESHOLD_MINUTES = int(
        os.getenv("ABANDONED_CART_THRESHOLD_MINUTES", "30")
    )
    TRACKING_CURRENCY = os.getenv("TRACKING_CURRENCY", "EGP")
    # أقصى عدد أحداث في الدفعة الواحدة لمنع إساءة استخدام نقطة الاستقبال.
    TRACKING_MAX_BATCH = int(os.getenv("TRACKING_MAX_BATCH", "50"))
    # رفع الصور (بنرات + منتجات) — تُخزَّن على القرص وتُخدم عبر /uploads.
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", str(BASE_DIR / "uploads"))
    # سقف لكل نوع على حدة: صور المنتجات أصغر حجماً عادةً من صور البنرات
    # العريضة، والخلط كان يجعل حدّاً واحداً غير مضبوط لأي منهما.
    BANNER_MAX_BYTES = int(os.getenv("BANNER_MAX_BYTES", str(5 * 1024 * 1024)))
    PRODUCT_MAX_BYTES = int(os.getenv("PRODUCT_MAX_BYTES", str(8 * 1024 * 1024)))
    ALLOWED_IMAGE_EXTENSIONS = {
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
        "avif",
    }


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", _sqlite_path("dev.db"))


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "")


def validate_production_secrets() -> None:
    """يمنع التشغيل بمفاتيح التطوير الافتراضية المعروفة.

    `from_object` لا ينشئ نسخة من الأصناف، لذا الفحص يجري صريحاً عند
    الإقلاع بدل الاعتماد على `__init__`.
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL مطلوب في بيئة الإنتاج")
    
    for name, development_default in (
        ("SECRET_KEY", "shelight-dev-secret-key-0123456789"),
        ("JWT_SECRET_KEY", "shelight-dev-jwt-secret-key-0123456789"),
    ):
        value = os.getenv(name)
        if not value or value == development_default:
            raise RuntimeError(
                f"{name} مطلوب في بيئة الإنتاج ويجب أن يختلف عن قيمة التطوير"
            )


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite://")
    CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]


config_map: dict[str, type[Config]] = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}