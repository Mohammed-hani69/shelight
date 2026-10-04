"""Schemas تصدير بيانات الكتالوج — مفاتيح camelCase لتطابق عقد الواجهة.

يُحقن متوسط التقييم وعدد المراجعات POST-dump في الـ routes
لتفادي استعلام N+1 (تُجمَّع الإحصاءات دفعة واحدة).
"""
from __future__ import annotations

from marshmallow import Schema, fields

from app.core.i18n import DEFAULT_LANG, localized


class LocalizedSchema(Schema):
    """أساس للمخططات التي تختار الحقول حسب `lang` المُمرَّر عند الإنشاء.

    تُضبط `_lang` قبل `super().__init__` لأن `fields.Method` يربط دوال
    التصدير إلى المخطط أثناء تهيئة الحقول.
    """

    def __init__(self, *args, lang: str = DEFAULT_LANG, **kwargs) -> None:
        self._lang = lang
        super().__init__(*args, **kwargs)

    def _localized(self, obj, field: str):
        return localized(obj, field, self._lang)


class ImageOut(LocalizedSchema):
    id = fields.Method("_id")
    url = fields.Str()
    alt = fields.Method("_alt")

    @staticmethod
    def _id(obj):
        return str(obj.id)

    def _alt(self, obj):
        return self._localized(obj, "alt")


class CategoryBriefOut(LocalizedSchema):
    id = fields.Method("_id")
    slug = fields.Str()
    name = fields.Method("_name")

    @staticmethod
    def _id(obj):
        return str(obj.id)

    def _name(self, obj):
        return self._localized(obj, "name")


class ConcernBriefOut(LocalizedSchema):
    id = fields.Method("_id")
    slug = fields.Str()
    name = fields.Method("_name")

    @staticmethod
    def _id(obj):
        return str(obj.id)

    def _name(self, obj):
        return self._localized(obj, "name")


class ProductBaseOut(LocalizedSchema):
    id = fields.Method("_id")
    slug = fields.Str()
    name = fields.Method("_name")
    shortDescription = fields.Method("_short_description")
    price = fields.Float()
    compareAtPrice = fields.Float(attribute="compare_at_price", allow_none=True)
    stock = fields.Int()
    inventoryStatus = fields.Method("_inventory_status")
    tags = fields.Method("_tags")
    category = fields.Method("_category")
    images = fields.Method("_images")
    isBestseller = fields.Bool(attribute="is_bestseller")
    isNew = fields.Bool(attribute="is_new")
    featured = fields.Bool(attribute="is_featured")

    @staticmethod
    def _id(obj):
        return str(obj.id)

    def _name(self, obj):
        return self._localized(obj, "name")

    def _short_description(self, obj):
        return self._localized(obj, "short_description")

    def _category(self, obj):
        if obj.category is None:
            return None
        return CategoryBriefOut(lang=self._lang).dump(obj.category)

    def _images(self, obj):
        return ImageOut(lang=self._lang, many=True).dump(list(obj.images or []))

    @staticmethod
    def _inventory_status(obj):
        if obj.stock <= 0:
            return "out-of-stock"
        if obj.stock <= 5:
            return "low-stock"
        return "in-stock"

    @staticmethod
    def _tags(obj):
        return [t.strip() for t in (obj.tags or "").split(",") if t.strip()]


class ProductOut(ProductBaseOut):
    """تفاصيل كاملة — صفحة المنتج."""

    description = fields.Method("_description")
    benefits = fields.Raw()
    ingredients = fields.Raw()
    howToUse = fields.Raw(attribute="how_to_use")
    suitableFor = fields.Raw(attribute="suitable_for")
    faqs = fields.Raw()
    variants = fields.Raw()
    concerns = fields.Method("_concerns")
    createdAt = fields.Method("_created_at")

    def _description(self, obj):
        return self._localized(obj, "description")

    def _concerns(self, obj):
        return ConcernBriefOut(lang=self._lang, many=True).dump(list(obj.concerns or []))

    @staticmethod
    def _created_at(obj):
        return obj.created_at.isoformat() if obj.created_at else None


class ProductListOut(ProductBaseOut):
    """بطاقة منتج — قوائم المتجر والفئات والبحث."""