"""Schemas الطلبات — إدخال أمان وإخراج تاريخي.

قاعدة أمنية: لا يثق الخادم بأي سعر/إجمالي يرسله العميل؛
كل الحسابات تُعاد في الـ service باستخدام أسعار قاعدة البيانات.
"""
from __future__ import annotations

from marshmallow import Schema, fields, validate

from app.core.i18n import DEFAULT_LANG


class ShippingAddressSchema(Schema):
    firstName = fields.Str(required=True, data_key="firstName", validate=validate.Length(min=2, max=100))
    lastName = fields.Str(data_key="lastName", load_default="", validate=validate.Length(max=100))
    phone = fields.Str(
        required=True, data_key="phone", validate=validate.Length(min=8, max=32)
    )
    address = fields.Str(
        required=True, data_key="address", validate=validate.Length(min=5, max=300)
    )
    city = fields.Str(required=True, data_key="city", validate=validate.Length(max=120))
    governorate = fields.Str(
        required=True, data_key="governorate", validate=validate.Length(max=120)
    )
    notes = fields.Str(data_key="notes", load_default="", validate=validate.Length(max=1000))


class CheckoutItemSchema(Schema):
    productId = fields.Int(required=True, data_key="productId")
    quantity = fields.Int(data_key="quantity", load_default=1, validate=validate.Range(min=1, max=99))


class CheckoutSchema(Schema):
    email = fields.Email(required=False, data_key="email")
    shipping = fields.Nested(ShippingAddressSchema, required=True)
    paymentMethod = fields.Str(
        data_key="paymentMethod", load_default="cod", validate=validate.OneOf(["cod", "card"])
    )
    couponCode = fields.Str(data_key="couponCode", load_default="", validate=validate.Length(max=50))
    items = fields.List(
        fields.Nested(CheckoutItemSchema),
        required=True,
        validate=validate.Length(min=1, max=50),
    )
    # حقول تتبّع اختيارية — لا تؤثر على الطلب، تُستخدم لربط الشراء بالرحلة.
    sessionId = fields.Str(data_key="sessionId", load_default=None, validate=validate.Length(max=36))
    checkoutKey = fields.Str(
        data_key="checkoutKey", load_default=None, validate=validate.Length(max=64)
    )


class OrderItemOut(Schema):
    """سطر الطلب — الاسم مخزَّن بلغتين، ويُختار حسب `lang`."""

    def __init__(self, *args, lang: str = DEFAULT_LANG, **kwargs) -> None:
        self._lang = lang
        super().__init__(*args, **kwargs)

    id = fields.Method("_id")
    productId = fields.Method("_product_id")
    name = fields.Method("_name")
    slug = fields.Str(attribute="product_slug")
    image = fields.Str(attribute="image_url")
    unitPrice = fields.Float(attribute="unit_price")
    quantity = fields.Int()

    @staticmethod
    def _id(obj):
        return str(obj.id)

    @staticmethod
    def _product_id(obj):
        return str(obj.product_id) if obj.product_id is not None else None

    def _name(self, obj):
        order = ("ar", "en") if self._lang == "ar" else ("en", "ar")
        for candidate in order:
            value = getattr(obj, f"product_name_{candidate}", None)
            if value:
                return value
        return None


class OrderOut(Schema):
    id = fields.Method("_id")
    orderNumber = fields.Str(attribute="order_number")
    status = fields.Str()
    subtotal = fields.Float()
    shippingCost = fields.Float(attribute="shipping_cost")
    discountAmount = fields.Float(attribute="discount_amount")
    total = fields.Float()
    couponCode = fields.Str(attribute="coupon_code", allow_none=True)
    paymentMethod = fields.Str(attribute="payment_method")
    paymentStatus = fields.Str(attribute="payment_status")
    email = fields.Method("_email")
    items = fields.Method("_items")
    shipping = fields.Method("_shipping")
    createdAt = fields.Method("_created_at")
    updatedAt = fields.Method("_updated_at")

    def __init__(self, *args, lang: str = DEFAULT_LANG, **kwargs) -> None:
        self._lang = lang
        super().__init__(*args, **kwargs)

    def _items(self, obj):
        return OrderItemOut(lang=self._lang, many=True).dump(list(obj.items or []))

    @staticmethod
    def _email(obj):
        """بريد العميل: الحساب أولاً ثم بريد الزائر — لإكمال بيانات الفاتورة."""
        if obj.customer is not None and obj.customer.email:
            return obj.customer.email
        return obj.guest_email

    def _shipping(self, obj):
        """عنوان الشحن يُبنى من أعمدة الطلب المسطّحة — لا يوجد relationship."""
        return {
            "firstName": obj.shipping_first_name,
            "lastName": obj.shipping_last_name,
            "phone": obj.shipping_phone,
            "address": obj.shipping_address,
            "city": obj.shipping_city,
            "governorate": obj.shipping_governorate,
            "notes": obj.notes,
        }

    @staticmethod
    def _id(obj):
        return str(obj.id)

    @staticmethod
    def _created_at(obj):
        return obj.created_at.isoformat() if obj.created_at else None

    @staticmethod
    def _updated_at(obj):
        return obj.updated_at.isoformat() if obj.updated_at else None


class OrderAdminOut(OrderOut):
    """`OrderOut` + بيانات الشحنة — لمسارات `/admin/*` فقط.

    يُفصل عن `OrderOut` عمداً: بيانات الشحنة (المزوّد، رقم التتبّع، الحالة)
    تخصّ لوحة التحكم، ولا داعي أن تخرج مع استجابات المتجر أو التتبّع العام.
    """

    shipment = fields.Method("_shipment")

    def _shipment(self, obj):
        """ملخّص حالة الشحنة كما وصلت من مزوّد الشحن."""
        return {
            "provider": obj.shipping_provider,
            "shipmentId": obj.shipping_provider_order_id,
            "trackingNumber": obj.tracking_number,
            "status": obj.shipping_status,
            # وقت آخر تحديث للحالة من المزوّد (updated_at للطلب).
            "updatedAt": obj.updated_at.isoformat() if obj.updated_at else None,
        }


class OrderTrackOut(Schema):
    """إخراج التتبّع العام — حقول أقل من `OrderOut`.

    يُستخدم لزائر بلا حساب، فيُقتطع العنوان والتفاصيل الشخصية.
    التحقق من صاحبية الطلب يتم في الـ service عبر مطابقة الموبايل،
    فهذا الـ schema لا يُعيد عنوان الشحن أو الموبايل.
    """

    def __init__(self, *args, lang: str = DEFAULT_LANG, **kwargs) -> None:
        self._lang = lang
        super().__init__(*args, **kwargs)

    orderNumber = fields.Str(attribute="order_number")
    status = fields.Str()
    paymentMethod = fields.Str(attribute="payment_method")
    paymentStatus = fields.Str(attribute="payment_status")
    total = fields.Float()
    itemCount = fields.Method("_item_count")
    placedAt = fields.Method("_created_at")
    items = fields.Method("_items")
    city = fields.Str(attribute="shipping_city")
    governorate = fields.Str(attribute="shipping_governorate")
    firstName = fields.Str(attribute="shipping_first_name")

    def _item_count(self, obj):
        return sum(item.quantity for item in obj.items or [])

    def _items(self, obj):
        return OrderItemOut(lang=self._lang, many=True).dump(list(obj.items or []))

    @staticmethod
    def _created_at(obj):
        return obj.created_at.isoformat() if obj.created_at else None