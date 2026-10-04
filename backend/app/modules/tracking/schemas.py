"""Schemas استقبال أحداث التتبّع — تحقّق صارم من الشكل والحجم."""
from __future__ import annotations

from marshmallow import Schema, fields, validate

# الأحداث المعروفة فقط تُخزَّن؛ أي اسم خارج القائمة يُتجاهل بأمان
# حتى لا تتحوّل نقطة الاستقبال إلى مخزن بيانات عشوائية.
ALLOWED_EVENTS = frozenset(
    {
        "page_view",
        "product_view",
        "product_image_view",
        "product_variant_select",
        "product_search",
        "product_filter",
        "product_sort",
        "add_to_cart",
        "remove_from_cart",
        "update_cart_quantity",
        "view_cart",
        "wishlist_add",
        "wishlist_remove",
        "bundle_view",
        "category_view",
        "journal_view",
        "search",
        "begin_checkout",
        "add_contact_info",
        "add_shipping_info",
        "select_shipping_method",
        "add_payment_info",
        "checkout_error",
        "coupon_applied",
        "coupon_removed",
        "coupon_error",
        "purchase",
        "order_failed",
        "sign_up",
        "login",
        "logout",
        "newsletter_subscribe",
    }
)


class EventIn(Schema):
    """حدث واحد من دفعة التتبّع."""

    eventId = fields.Str(required=True, validate=validate.Length(min=1, max=64))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=80))
    sessionId = fields.Str(load_default=None, validate=validate.Length(max=36))
    timestamp = fields.DateTime(load_default=None)
    pageUrl = fields.Str(load_default=None, validate=validate.Length(max=1000))
    referrer = fields.Str(load_default=None, validate=validate.Length(max=1000))
    path = fields.Str(load_default=None, validate=validate.Length(max=500))
    properties = fields.Dict(load_default=dict)


class TrackBatchSchema(Schema):
    """دفعة أحداث. السقف الفعلي يُقرأ من الإعداد TRACKING_MAX_BATCH."""

    events = fields.List(
        fields.Nested(EventIn), required=True, validate=validate.Length(min=1, max=200)
    )
    # بديل عن الترويسة عندما يتعذّر إرسالها (مثل طلبات keepalive عند مغادرة الصفحة).
    anonymousId = fields.Str(load_default=None, validate=validate.Length(max=36))


class IdentifySchema(Schema):
    """ربط زائر مجهول بالحساب المسجَّل — يُستدعى بعد login/signup."""

    anonymousId = fields.Str(required=True, validate=validate.Length(min=1, max=36))


class CheckoutLeadSchema(Schema):
    """حفظ تدريجي لهوية العميل المحتمل أثناء الدفع — كل الحقول اختيارية.

    لا يوجد بريد إلكتروني إطلاقاً؛ الهاتف الأساسي هو معرّف التواصل،
    والهاتف الثاني اختياري ومكمّل.
    """

    checkoutKey = fields.Str(load_default=None, validate=validate.Length(max=64))
    sessionId = fields.Str(load_default=None, validate=validate.Length(max=36))
    # بديل عن الترويسة عندما يتعذّر إرسالها (مثل طلبات keepalive عند مغادرة الحقل).
    anonymousId = fields.Str(load_default=None, validate=validate.Length(max=36))
    fullName = fields.Str(load_default=None, validate=validate.Length(max=200))
    primaryPhone = fields.Str(load_default=None, validate=validate.Length(max=32))
    secondaryPhone = fields.Str(load_default=None, validate=validate.Length(max=32))
    address = fields.Str(load_default=None, validate=validate.Length(max=300))
    city = fields.Str(load_default=None, validate=validate.Length(max=120))
    governorate = fields.Str(load_default=None, validate=validate.Length(max=120))
