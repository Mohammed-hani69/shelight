"""Schemas تصدير الباقات — مفاتيح camelCase لتطابق عقد الواجهة.

الباقة تُصدَّر مع أعضائها كبيانات منتج كاملة لأن الواجهة تحتاج الصورة
والاسم والسعر لعرض بطاقات الأبناء داخل بطاقة الباقة.
"""
from __future__ import annotations

from marshmallow import fields

from app.modules.products.schemas import LocalizedSchema, ProductListOut


class BundleItemOut(LocalizedSchema):
    """عضو الباقة: المنتج وكميته."""

    productId = fields.Int(attribute="product_id")
    quantity = fields.Int()
    product = fields.Method("_product")

    def _product(self, obj):
        return ProductListOut(lang=self._lang).dump(obj.product)


class BundleOut(LocalizedSchema):
    """باقة كاملة مع أعضائها وكود الخصم الخاص بها."""

    id = fields.Method("_id")
    slug = fields.Str()
    name = fields.Method("_name")
    description = fields.Method("_description")
    image = fields.Str(attribute="image_url")
    badge = fields.Method("_badge")
    price = fields.Float()
    compareAtPrice = fields.Float(attribute="compare_at_price")
    couponCode = fields.Str(attribute="coupon_code", allow_none=True)
    rating = fields.Float()
    reviewCount = fields.Int(attribute="review_count")
    itemCount = fields.Method("_item_count")
    items = fields.Method("_items")

    @staticmethod
    def _id(obj):
        return str(obj.id)

    def _name(self, obj):
        return self._localized(obj, "name")

    def _description(self, obj):
        return self._localized(obj, "description")

    def _badge(self, obj):
        return self._localized(obj, "badge")

    def _item_count(self, obj):
        return sum(item.quantity for item in obj.items)

    def _items(self, obj):
        return BundleItemOut(lang=self._lang, many=True).dump(list(obj.items))
