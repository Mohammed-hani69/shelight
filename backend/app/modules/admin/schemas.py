"""Schemas لوحة التحكم — إدخال موثّق للإنشاء والتحديث عبر المدير."""
from __future__ import annotations

from decimal import Decimal

from marshmallow import Schema, fields, validate


class AdminLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class AdminCategoryMoveSchema(Schema):
    direction = fields.Str(
        required=True, validate=validate.OneOf(["up", "down"])
    )


class ProductImageInputSchema(Schema):
    url = fields.Str(required=True)
    alt_en = fields.Str(load_default="")
    alt_ar = fields.Str(load_default="")


class ProductWriteSchema(Schema):
    """إنشاء/تحديث منتج — كل الحقول الأساسية بمفاتيح camelCase."""

    slug = fields.Str(required=True)
    sku = fields.Str(required=True)
    name_en = fields.Str(required=True)
    name_ar = fields.Str(load_default="")
    short_description_en = fields.Str(load_default="")
    short_description_ar = fields.Str(load_default="")
    description_en = fields.Str(load_default="")
    description_ar = fields.Str(load_default="")
    price = fields.Decimal(required=True, places=2, as_string=True)
    compare_at_price = fields.Decimal(places=2, allow_none=True, as_string=True)
    stock = fields.Int(load_default=0)
    tags = fields.List(fields.Str(), load_default=list)
    category_slug = fields.Str(allow_none=True)
    concerns = fields.List(fields.Str(), load_default=list)
    images = fields.List(fields.Nested(ProductImageInputSchema), load_default=list)
    benefits = fields.List(fields.Str(), load_default=list)
    ingredients = fields.List(fields.Str(), load_default=list)
    how_to_use = fields.List(fields.Str(), load_default=list, data_key="howToUse")
    suitable_for = fields.List(fields.Str(), load_default=list, data_key="suitableFor")
    faqs = fields.List(fields.Dict(), load_default=list)
    variants = fields.List(fields.Dict(), load_default=list)
    is_featured = fields.Bool(load_default=False, data_key="isFeatured")
    is_bestseller = fields.Bool(load_default=False, data_key="isBestseller")
    is_new = fields.Bool(load_default=False, data_key="isNew")
    is_active = fields.Bool(load_default=True, data_key="isActive")


class OrderShippingUpdateSchema(Schema):
    """تعديل بيانات شحن الطلب من اللوحة — كل الحقول اختيارية."""

    firstName = fields.Str(validate=validate.Length(min=2, max=100))
    lastName = fields.Str(validate=validate.Length(max=100))
    phone = fields.Str(validate=validate.Length(min=8, max=32))
    address = fields.Str(validate=validate.Length(min=5, max=300))
    city = fields.Str(validate=validate.Length(max=120))
    governorate = fields.Str(validate=validate.Length(max=120))
    notes = fields.Str(validate=validate.Length(max=1000))


class OrderStatusUpdateSchema(Schema):
    """تحكّم كامل بالطلب من اللوحة: الحالة، الدفع، طريقة الدفع، وبيانات الشحن."""

    status = fields.Str(
        validate=validate.OneOf(["pending", "processing", "shipped", "delivered", "cancelled"])
    )
    payment_status = fields.Str(
        data_key="paymentStatus",
        validate=validate.OneOf(["pending", "paid", "failed", "refunded"]),
    )
    payment_method = fields.Str(
        data_key="paymentMethod", validate=validate.OneOf(["cod", "card"])
    )
    shipping = fields.Nested(OrderShippingUpdateSchema)


class CouponWriteSchema(Schema):
    code = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    discount_type = fields.Str(
        required=True, data_key="discountType", validate=validate.OneOf(["percent", "fixed"])
    )
    value = fields.Decimal(required=True, places=2, as_string=True)
    min_spend = fields.Decimal(places=2, as_string=True, data_key="minSpend", load_default=0)
    usage_limit = fields.Int(data_key="usageLimit", allow_none=True)
    valid_from = fields.DateTime(data_key="validFrom", allow_none=True)
    valid_until = fields.DateTime(data_key="validUntil", allow_none=True)
    is_active = fields.Bool(data_key="isActive", load_default=True)


class CustomerAdminUpdateSchema(Schema):
    is_active = fields.Bool(data_key="isActive")
    loyalty_points = fields.Int(data_key="loyaltyPoints", validate=validate.Range(min=0))


def coupon_admin_payload(coupon) -> dict:
    """تمثيل الكوبون في لوحة التحكم — لا يُكشف إلا ما تحتاجه اللوحة."""
    return {
        "id": str(coupon.id),
        "code": coupon.code,
        "discountType": coupon.discount_type,
        "value": float(coupon.value),
        "minSpend": float(coupon.min_spend),
        "usageLimit": coupon.usage_limit,
        "usedCount": coupon.used_count,
        "validFrom": coupon.valid_from.isoformat() if coupon.valid_from else None,
        "validUntil": coupon.valid_until.isoformat() if coupon.valid_until else None,
        "isActive": coupon.is_active,
    }


class CategoryWriteSchema(Schema):
    """إنشاء/تحديث فئة أو قسم — مفاتيح camelCase كما في بقية اللوحة."""

    slug = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    name_ar = fields.Str(required=True, data_key="nameAr")
    name_en = fields.Str(required=True, data_key="nameEn")
    description_ar = fields.Str(data_key="descriptionAr", load_default="")
    description_en = fields.Str(data_key="descriptionEn", load_default="")
    image_url = fields.Str(data_key="imageUrl", allow_none=True)
    parent_slug = fields.Str(data_key="parentSlug", allow_none=True)
    sort_order = fields.Int(data_key="sortOrder", load_default=0)
    is_featured = fields.Bool(data_key="isFeatured", load_default=False)
    is_active = fields.Bool(data_key="isActive", load_default=True)


def category_admin_payload(category, products_count: int | None = None) -> dict:
    """تمثيل الفئة في لوحة التحكم — شامل كل الحقول لإعادة العرض والتحرير."""
    return {
        "id": str(category.id),
        "parentId": str(category.parent_id) if category.parent_id else None,
        "parentSlug": category.parent.slug if category.parent else None,
        "slug": category.slug,
        "nameAr": category.name_ar,
        "nameEn": category.name_en,
        "descriptionAr": category.description_ar,
        "descriptionEn": category.description_en,
        "imageUrl": category.image_url,
        "sortOrder": category.sort_order,
        "isFeatured": category.is_featured,
        "isActive": category.is_active,
        "productsCount": products_count if products_count is not None else len(category.products),
    }


class BundleItemInputSchema(Schema):
    """عضو ضمن الباقة — يُحدَّد بمعرّف المنتج وكميته."""

    slug = fields.Str(required=True, data_key="productSlug")
    quantity = fields.Int(load_default=1, validate=validate.Range(min=1))


class BundleWriteSchema(Schema):
    """إنشاء/تحديث باقة — السعر يُملأ يدوياً ويُحسب سعر المقارنة آلياً."""

    slug = fields.Str(required=True)
    name_en = fields.Str(required=True, data_key="nameEn")
    name_ar = fields.Str(data_key="nameAr", load_default="")
    description_en = fields.Str(data_key="descriptionEn", load_default="")
    description_ar = fields.Str(data_key="descriptionAr", load_default="")
    image_url = fields.Str(data_key="imageUrl", load_default="")
    badge_en = fields.Str(data_key="badgeEn", load_default="")
    badge_ar = fields.Str(data_key="badgeAr", load_default="")
    price = fields.Decimal(required=True, places=2, as_string=True)
    coupon_code = fields.Str(data_key="couponCode", load_default="")
    is_active = fields.Bool(data_key="isActive", load_default=True)
    sort_order = fields.Int(data_key="sortOrder", load_default=0)
    items = fields.List(fields.Nested(BundleItemInputSchema), load_default=list)


class BundleAdminUpdateSchema(Schema):
    """تحديث جزئي سريع — للمفاتيح فحسب (إخفاء/تفعيل/ترتيب)."""

    is_active = fields.Bool(data_key="isActive")
    sort_order = fields.Int(data_key="sortOrder")


class BundleMoveSchema(Schema):
    direction = fields.Str(required=True, validate=validate.OneOf(["up", "down"]))


def bundle_admin_payload(bundle) -> dict:
    """تمثيل الباقة في اللوحة — حقول خام للتحرير + أعضاء مع معرّفات منتجات."""
    member_total = sum(
        (Decimal(item.product.price) * item.quantity for item in bundle.items), Decimal("0")
    )
    return {
        "id": str(bundle.id),
        "slug": bundle.slug,
        "nameAr": bundle.name_ar,
        "nameEn": bundle.name_en,
        "descriptionAr": bundle.description_ar,
        "descriptionEn": bundle.description_en,
        "imageUrl": bundle.image_url,
        "badgeAr": bundle.badge_ar,
        "badgeEn": bundle.badge_en,
        "price": float(bundle.price),
        "compareAtPrice": float(bundle.compare_at_price),
        "membersTotal": float(member_total),
        "savings": float(bundle.compare_at_price - bundle.price),
        "couponCode": bundle.coupon_code,
        "isActive": bundle.is_active,
        "sortOrder": bundle.sort_order,
        "itemCount": sum(item.quantity for item in bundle.items),
        "items": [
            {
                "productId": str(item.product_id),
                "productSlug": item.product.slug,
                "quantity": item.quantity,
            }
            for item in bundle.items
        ],
    }


class JournalWriteSchema(Schema):
    """إنشاء/تحديث مقال مدونة — المحتوى قائمة فقرات نصية بكل لغة."""

    slug = fields.Str(required=True)
    title_en = fields.Str(required=True, data_key="titleEn")
    title_ar = fields.Str(data_key="titleAr", load_default="")
    excerpt_en = fields.Str(data_key="excerptEn", load_default="")
    excerpt_ar = fields.Str(data_key="excerptAr", load_default="")
    content_en = fields.List(fields.Str(), data_key="contentEn", load_default=list)
    content_ar = fields.List(fields.Str(), data_key="contentAr", load_default=list)
    category = fields.Str(load_default="المدونة")
    author = fields.Str(load_default="فريق شيلايت")
    read_time = fields.Str(data_key="readTime", load_default="قراءة 5 دقائق")
    publish_date = fields.Date(data_key="publishDate", required=True)
    image_url = fields.Str(data_key="imageUrl", load_default="")
    is_featured = fields.Bool(data_key="isFeatured", load_default=False)
    is_published = fields.Bool(data_key="isPublished", load_default=True)


class JournalPatchSchema(Schema):
    """تحديث جزئي سريع — تمييز و/أو نشر/إخفاء."""

    is_featured = fields.Bool(data_key="isFeatured")
    is_published = fields.Bool(data_key="isPublished")


def journal_admin_payload(article) -> dict:
    """تمثيل المقال في اللوحة — حقول خام باللغتين لإعادة العرض والتحرير."""
    return {
        "id": str(article.id),
        "slug": article.slug,
        "titleAr": article.title_ar,
        "titleEn": article.title_en,
        "excerptAr": article.excerpt_ar,
        "excerptEn": article.excerpt_en,
        "contentAr": list(article.content_ar or []),
        "contentEn": list(article.content_en or []),
        "category": article.category,
        "author": article.author,
        "readTime": article.read_time,
        "publishDate": article.publish_date.isoformat(),
        "imageUrl": article.image_url,
        "isFeatured": article.is_featured,
        "isPublished": article.is_published,
    }