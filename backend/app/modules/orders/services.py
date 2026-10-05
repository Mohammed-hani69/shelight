"""منطق الطلبات — إنشاء الطلب مغلف بكل التحقق المالي والمخزوني."""
from __future__ import annotations

import secrets
from decimal import Decimal

from flask import current_app
from sqlalchemy import select

from app.core.errors import ApiError
from app.core.security import hash_password
from app.core.pagination import paginate
from app.core.utils import normalize_phone, utcnow
from app.extensions import db
from app.models import CartItem, Customer, Order, OrderItem, Product
from app.modules.coupons import services as coupon_service
from app.modules.customers import services as customer_service
from app.modules.tracking import services as tracking_service
from app.modules.marketing_sections.store_settings import get_store_settings


def _next_order_number() -> str:
    """رقم فريد للطلب: SL+تاريخ+رقم عشوائي."""
    return f"SL-{utcnow():%Y%m%d}-{secrets.randbelow(1_000_000):06d}"


def _collect_items(entries: list[dict]) -> tuple[list[tuple[Product, int]], Decimal]:
    """يقرأ منتجات السلة من قاعدة البيانات ويجمع الكميات المكرّرة.

    العميل قد يرسل نفس المنتج في سطرين (`[{p,3},{p,3}]`). التحقق
    والخصم يتمّان لكل سطر، فيمرّ 6 وحدات على مخزون 4 ويصبح المخزون
    سالباً. لذلك نجمع الكمية الإجمالية للمنتج ونخصمها مرة واحدة.
    """
    quantities: dict[int, int] = {}
    products: dict[int, Product] = {}
    order: list[int] = []

    for entry in entries:
        product = db.session.get(Product, entry["productId"])
        if product is None or not product.is_active:
            raise ApiError("أحد المنتجات غير موجود", status_code=404)
        if product.id not in products:
            products[product.id] = product
            order.append(product.id)
        quantities[product.id] = quantities.get(product.id, 0) + int(entry["quantity"])

    rows: list[tuple[Product, int]] = []
    subtotal = Decimal("0")
    for product_id in order:
        product = products[product_id]
        quantity = quantities[product_id]
        if product.stock < quantity:
            raise ApiError(
                f"الكمية المطلوبة من {product.name_en} غير متوفرة حالياً",
                status_code=409,
                code="insufficient_stock",
            )
        rows.append((product, quantity))
        subtotal += Decimal(product.price) * quantity
    return rows, subtotal


def checkout(
    data: dict, customer_id: int | None, visitor_id: str | None = None
) -> Order:
    """يُنشئ الطلب ويراجع الأسعار والمخزون ويطبّق الكوبون ويخصم المخزون.

    - الأسعار تُؤخذ من قاعدة البيانات لا من العميل.
    - الخصم يتم في معاملة واحدة: أي خطأ يُلغي كل شيء.
    - بعد نجاح الطلب يُسجَّل حدث الشراء (الموثوق) ويُربط بالرحلة.
    """
    rows, subtotal = _collect_items(data["items"])

    store_settings = get_store_settings()
    governorate_key = shipping.get("governorateKey")
    shipping_fee = store_settings["governorateFees"].get(
        governorate_key, store_settings["defaultShippingFee"]
    )
    threshold = Decimal(str(store_settings["freeShippingThreshold"]))
    shipping_cost = Decimal(str(shipping_fee)) if subtotal < threshold else Decimal("0")
    discount = Decimal("0")
    coupon_code: str | None = None
    raw_code = (data.get("couponCode") or "").strip()
    if raw_code:
        coupon = coupon_service.validate(raw_code, subtotal)
        discount = coupon_service.discount_amount(coupon, subtotal)
        coupon_code = coupon.code
        coupon.used_count += 1

    total = subtotal + Decimal(shipping_cost) - discount

    customer = db.session.get(Customer, customer_id) if customer_id else None
    shipping = data["shipping"]
    if customer is None:
        normalized_phone = normalize_phone(shipping["phone"])
        if not normalized_phone:
            raise ApiError("رقم الهاتف غير صالح", status_code=400, code="invalid_phone")
        customer = Customer.query.filter_by(normalized_phone=normalized_phone).first()
        if customer is None:
            customer = Customer(
                first_name=shipping["firstName"],
                last_name=shipping.get("lastName") or "",
                phone=shipping["phone"],
                normalized_phone=normalized_phone,
                address=shipping["address"],
                city=shipping["city"],
                governorate=shipping["governorate"],
                password_hash=hash_password(shipping["phone"]),
            )
            db.session.add(customer)
            db.session.flush()
        customer_service.link_guest_orders(customer)

    order = Order(
        order_number=_next_order_number(),
        customer_id=customer.id if customer else None,
        guest_email=(data.get("email") or "").strip() or None,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        discount_amount=discount,
        total=total,
        coupon_code=coupon_code,
        payment_method=data["paymentMethod"],
        # لا توجد بوابة دفع مدمجة، فلا يُعلن نجاح الدفع بناءً على
        # اختيار العميل للطريقة — التأكيد يأتي من بوابة الدفع/تشغيل لاحق.
        payment_status="pending",
        shipping_first_name=shipping["firstName"],
        shipping_last_name=shipping.get("lastName") or "",
        shipping_phone=shipping["phone"],
        shipping_address=shipping["address"],
        shipping_city=shipping["city"],
        shipping_governorate=shipping["governorate"],
        notes=shipping.get("notes") or "",
    )

    for product, quantity in rows:
        order.items.append(
            OrderItem(
                product_id=product.id,
                product_name_en=product.name_en,
                product_name_ar=product.name_ar,
                product_slug=product.slug,
                image_url=product.primary_image_url,
                unit_price=product.price,
                quantity=quantity,
            )
        )
        product.stock -= quantity

    if customer_id:
        CartItem.query.filter_by(owner_id=customer_id).delete()

    db.session.add(order)
    try:
        db.session.commit()
    except Exception:
        # خصم المخزون والكوبون وإفراغ السلة كلها في معاملة واحدة؛ أي خطأ
        # هنا يجب ألا يترك المخزون ناقصاً أو كوبوناً محسوباً بلا طلب.
        db.session.rollback()
        raise

    # التتبّع لا يُفشل الطلب: الطلب حُفظ بالفعل، وأي خطأ هنا يُلغى وحده.
    try:
        tracking_service.record_purchase(
            order,
            visitor_id=visitor_id,
            session_id=data.get("sessionId"),
            checkout_key=data.get("checkoutKey"),
        )
    except Exception:
        db.session.rollback()
        current_app.logger.exception("تعذّر تسجيل حدث الشراء")
    return order


def list_customer_orders(customer_id: int, page_size: int | None = None) -> tuple[list[Order], dict]:
    """أوامر العميل الحالي — الأحدث أولاً."""
    query = (
        select(Order)
        .where(Order.customer_id == customer_id)
        .order_by(Order.created_at.desc())
    )
    return paginate(query, page_size or current_app.config["PAGINATION_PAGE_SIZE"])


def get_customer_order(customer_id: int, order_number: str) -> Order:
    """طلب معيّن يخص العميل الحالي فقط."""
    order = Order.query.filter_by(
        customer_id=customer_id, order_number=order_number.strip().upper()
    ).first()
    if order is None:
        raise ApiError("الطلب غير موجود", status_code=404)
    return order


def _phone_matches(stored: str | None, submitted: str | None) -> bool:
    """هل رقم الموبايل المُدخل هو نفسه المحفوظ على الطلب؟"""
    saved = normalize_phone(stored)
    given = normalize_phone(submitted)
    if not saved or not given:
        return False
    # نقارن آخر 9 أرقام حتى يتقبّل المستخدم كتابة الرقم بصيغ مختلفة.
    if len(saved) >= 9 and len(given) >= 9:
        return saved[-9:] == given[-9:]
    return saved == given


def track_order(order_number: str, phone: str) -> Order:
    """تتبّع طلب لغير المسجّلين: رقم الطلب + رقم الموبايل.

    أرقام الطلبات متسلسلة فيزيائية، لذلك لا يُكشف عن الطلب إلا لمن
    يذكر الرقم *و* الموبايل. والخطأ واحد في الحالتين حتى لا تُستخدم
    الصفحة كـ«هل يوجد طلب بهذا الرقم؟».
    """
    number = (order_number or "").strip().upper()
    if not number or not number.startswith("SL-") or not 3 <= len(number) <= 40:
        raise ApiError("رقم الطلب غير صحيح", status_code=400, code="invalid_order_number")
    if not (phone or "").strip():
        raise ApiError("رقم الموبايل مطلوب", status_code=400, code="phone_required")

    order = Order.query.filter_by(order_number=number).first()
    if order is None or not _phone_matches(order.shipping_phone, phone):
        raise ApiError("لا يوجد طلب مطابق", status_code=404, code="order_not_found")
    return order
