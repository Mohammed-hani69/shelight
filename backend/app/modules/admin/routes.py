"""روتات لوحة التحكم — كل المسارات محمية بـ @admin_required.

تسجيل الدخول للمدير يمر عبر POST /admin/login على نفس مساحة الموارد.
"""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token

from app.core.errors import ApiError
from app.core.pagination import page_params
from app.core.schema import load_json_or_400
from app.core.security import admin_required, verify_password
from app.extensions import db
from app.models import Bundle, Category, Coupon, Customer, JournalArticle, Order, Product
from app.modules.admin import services as admin_service
from app.modules.admin.schemas import (
    AdminCategoryMoveSchema,
    AdminLoginSchema,
    BundleAdminUpdateSchema,
    BundleMoveSchema,
    BundleWriteSchema,
    CategoryWriteSchema,
    CouponWriteSchema,
    CustomerAdminUpdateSchema,
    JournalPatchSchema,
    JournalWriteSchema,
    OrderStatusUpdateSchema,
    ProductWriteSchema,
    bundle_admin_payload,
    category_admin_payload,
    coupon_admin_payload,
    journal_admin_payload,
)
from app.modules.customers.schemas import CustomerPublicSchema
from app.modules.orders.schemas import OrderAdminOut
from app.modules.products.schemas import ProductOut
from app.modules.products.services import review_stats

bp = Blueprint("admin", __name__, url_prefix="/admin")


# ---------------------------------------------------------------------------
# الدخول
# ---------------------------------------------------------------------------


@bp.post("/login")
def login():
    """دخول المدير — يعيد تسكين valid للـ accessToken مع بيانات العميل."""
    data = load_json_or_400(AdminLoginSchema())
    customer = Customer.query.filter_by(email=data["email"].strip().lower()).first()
    if customer is None or not verify_password(data["password"], customer.password_hash):
        raise ApiError("بيانات الدخول غير صحيحة", status_code=401, code="invalid_credentials")
    if not customer.is_active:
        raise ApiError("الحساب موقوف", status_code=403, code="account_disabled")
    if not customer.is_admin:
        raise ApiError("هذا الحساب ليس لديه صلاحيات مدير", status_code=403, code="forbidden")

    return jsonify(
        {
            "data": {
                "accessToken": create_access_token(identity=str(customer.id)),
                "refreshToken": create_refresh_token(identity=str(customer.id)),
                "customer": CustomerPublicSchema().dump(customer),
            }
        }
    )


# ---------------------------------------------------------------------------
# الملخص
# ---------------------------------------------------------------------------


@bp.get("/dashboard")
@admin_required()
def dashboard():
    """أرقام الملخص للوحة البداية."""
    return jsonify({"data": admin_service.dashboard_summary()})


# ---------------------------------------------------------------------------
# المنتجات
# ---------------------------------------------------------------------------


def _product_payload_with_stats(product: Product) -> dict:
    payload = ProductOut().dump(product)
    avg, count = review_stats([product]).get(product.id, (0.0, 0))
    payload["rating"] = avg if count else 0.0
    payload["reviewCount"] = count
    # حقول خام للتحرير في اللوحة — لا نعتمد على الحقول المترجمة `name/description`.
    payload["nameEn"] = product.name_en
    payload["nameAr"] = product.name_ar
    payload["shortDescriptionEn"] = product.short_description_en or ""
    payload["shortDescriptionAr"] = product.short_description_ar or ""
    payload["descriptionEn"] = product.description_en or ""
    payload["descriptionAr"] = product.description_ar or ""
    payload["sku"] = product.sku
    payload["isActive"] = product.is_active
    payload["categorySlug"] = product.category.slug if product.category else None
    payload["concernSlugs"] = [c.slug for c in (product.concerns or [])]
    return payload


@bp.get("/products")
@admin_required()
def list_products():
    """كل المنتجات مع بحث وفئة وتوزيع صفحات."""
    page, page_size = page_params(12)
    filters = {
        "category_slug": request.args.get("category"),
        "search": request.args.get("search"),
        "page_size": page_size,
    }
    items, meta = admin_service.list_admin_products(filters)
    return jsonify({"data": [_product_payload_with_stats(p) for p in items], "meta": meta})


@bp.post("/products")
@admin_required()
def create_product():
    """إنشاء منتج جديد."""
    product = admin_service.create_product(load_json_or_400(ProductWriteSchema()))
    return jsonify({"data": _product_payload_with_stats(product)}), 201


@bp.get("/products/<int:product_id>")
@admin_required()
def get_product(product_id: int):
    product = db.session.get(Product, product_id)
    if product is None:
        raise ApiError("المنتج غير موجود", status_code=404)
    return jsonify({"data": _product_payload_with_stats(product)})


@bp.put("/products/<int:product_id>")
@admin_required()
def update_product(product_id: int):
    product = db.session.get(Product, product_id)
    if product is None:
        raise ApiError("المنتج غير موجود", status_code=404)
    updated = admin_service.update_product(product, load_json_or_400(ProductWriteSchema()))
    return jsonify({"data": _product_payload_with_stats(updated)})


@bp.delete("/products/<int:product_id>")
@admin_required()
def delete_product(product_id: int):
    """حذف منطقي (إخفاء) حتى لا تنكسر روابط الطلبات السابقة."""
    product = db.session.get(Product, product_id)
    if product is None:
        raise ApiError("المنتج غير موجود", status_code=404)
    product.is_active = False
    db.session.commit()
    return jsonify({"data": {"id": product_id, "isActive": False}})


# ---------------------------------------------------------------------------
# الطلبات
# ---------------------------------------------------------------------------


@bp.get("/orders")
@admin_required()
def list_orders():
    items, meta = admin_service.list_orders(request.args.get("status"))
    return jsonify({"data": OrderAdminOut(many=True).dump(items), "meta": meta})


@bp.get("/orders/<order_number>")
@admin_required()
def get_order(order_number: str):
    order = admin_service.get_order(order_number)
    return jsonify({"data": OrderAdminOut().dump(order)})


@bp.patch("/orders/<order_number>")
@admin_required()
def update_order(order_number: str):
    order = admin_service.update_order(
        admin_service.get_order(order_number), load_json_or_400(OrderStatusUpdateSchema())
    )
    return jsonify({"data": OrderAdminOut().dump(order)})


# ---------------------------------------------------------------------------
# الكوبونات
# ---------------------------------------------------------------------------


@bp.get("/coupons")
@admin_required()
def list_coupons():
    coupons = admin_service.list_coupons()
    return jsonify({"data": [coupon_admin_payload(c) for c in coupons]})


@bp.post("/coupons")
@admin_required()
def create_coupon():
    coupon = admin_service.create_coupon(load_json_or_400(CouponWriteSchema()))
    return jsonify({"data": coupon_admin_payload(coupon)}), 201


@bp.patch("/coupons/<int:coupon_id>")
@admin_required()
def update_coupon(coupon_id: int):
    coupon = db.session.get(Coupon, coupon_id)
    if coupon is None:
        raise ApiError("الكوبون غير موجود", status_code=404)
    updated = admin_service.update_coupon(coupon, load_json_or_400(CouponWriteSchema(), partial=True))
    return jsonify({"data": coupon_admin_payload(updated)})


@bp.delete("/coupons/<int:coupon_id>")
@admin_required()
def delete_coupon(coupon_id: int):
    coupon = db.session.get(Coupon, coupon_id)
    if coupon is None:
        raise ApiError("الكوبون غير موجود", status_code=404)
    admin_service.delete_coupon(coupon)
    return jsonify({"data": {"id": coupon_id}})


# ---------------------------------------------------------------------------
# العملاء
# ---------------------------------------------------------------------------


@bp.get("/customers")
@admin_required()
def list_customers():
    items, meta = admin_service.list_customers(request.args.get("search"))
    payload = CustomerPublicSchema(many=True).dump(items)
    for item, customer in zip(payload, items):
        item["isAdmin"] = customer.is_admin
        item["isActive"] = customer.is_active
    return jsonify({"data": payload, "meta": meta})


@bp.patch("/customers/<int:customer_id>")
@admin_required()
def update_customer(customer_id: int):
    customer = db.session.get(Customer, customer_id)
    if customer is None:
        raise ApiError("العميل غير موجود", status_code=404)
    updated = admin_service.update_customer(
        customer, load_json_or_400(CustomerAdminUpdateSchema())
    )
    payload = CustomerPublicSchema().dump(updated)
    payload["isAdmin"] = updated.is_admin
    payload["isActive"] = updated.is_active
    return jsonify({"data": payload})


# ---------------------------------------------------------------------------
# الفئات / الأقسام
# ---------------------------------------------------------------------------


@bp.get("/categories")
@admin_required()
def list_categories():
    """شجرة الفئات كاملة (نشطة ومخفية) مع عدد المنتجات — لإدارة أقسام الموقع."""
    return jsonify({"data": admin_service.category_admin_tree()})


@bp.post("/categories")
@admin_required()
def create_category():
    category = admin_service.create_category(load_json_or_400(CategoryWriteSchema()))
    return jsonify({"data": category_admin_payload(category)}), 201


@bp.get("/categories/<int:category_id>")
@admin_required()
def get_category(category_id: int):
    category = admin_service.get_category_or_404(category_id)
    return jsonify({"data": category_admin_payload(category)})


@bp.put("/categories/<int:category_id>")
@admin_required()
def update_category(category_id: int):
    category = admin_service.get_category_or_404(category_id)
    updated = admin_service.update_category(
        category, load_json_or_400(CategoryWriteSchema())
    )
    return jsonify({"data": category_admin_payload(updated)})


@bp.patch("/categories/<int:category_id>")
@admin_required()
def patch_category(category_id: int):
    """تحديث جزئي — للأزرار السريعة (تمييز/إخفاء/ترتيب) دون إعادة فتح النموذج."""
    category = admin_service.get_category_or_404(category_id)
    updated = admin_service.update_category(
        category, load_json_or_400(CategoryWriteSchema(), partial=True)
    )
    return jsonify({"data": category_admin_payload(updated)})


@bp.delete("/categories/<int:category_id>")
@admin_required()
def delete_category(category_id: int):
    """إخفاء منطقي — تختفي من الرئيسية والتنقل دون حذف السجل."""
    category = admin_service.get_category_or_404(category_id)
    admin_service.delete_category(category)
    return jsonify({"data": {"id": category_id, "isActive": False}})


@bp.post("/categories/<int:category_id>/move")
@admin_required()
def move_category(category_id: int):
    """إعادة ترتيب بـ «أعلى/أسفل» بين إخوة نفس المستوى."""
    category = admin_service.get_category_or_404(category_id)
    direction = load_json_or_400(AdminCategoryMoveSchema())["direction"]
    admin_service.move_category(category, direction)
    return jsonify({"data": {"moved": True}})


# ---------------------------------------------------------------------------
# الباقات (الطقوس الجاهزة)
# ---------------------------------------------------------------------------


@bp.get("/bundles")
@admin_required()
def list_bundles():
    """كل الباقات (نشطة ومخفية) مع أعضائها — لإدارة عروض الأطقم."""
    bundles = admin_service.list_admin_bundles()
    return jsonify({"data": [bundle_admin_payload(b) for b in bundles]})


@bp.post("/bundles")
@admin_required()
def create_bundle():
    """إنشاء باقة — يُحسب سعر المقارنة من الأعضاء ويُزامَن كوبونها آلياً."""
    bundle = admin_service.create_bundle(load_json_or_400(BundleWriteSchema()))
    return jsonify({"data": bundle_admin_payload(bundle)}), 201


@bp.get("/bundles/<int:bundle_id>")
@admin_required()
def get_bundle(bundle_id: int):
    bundle = admin_service.get_bundle_or_404(bundle_id)
    return jsonify({"data": bundle_admin_payload(bundle)})


@bp.put("/bundles/<int:bundle_id>")
@admin_required()
def update_bundle(bundle_id: int):
    """تحديث كامل — استبدال الأعضاء يُعيد احتساب سعر المقارنة والكوبون."""
    bundle = admin_service.get_bundle_or_404(bundle_id)
    updated = admin_service.update_bundle(bundle, load_json_or_400(BundleWriteSchema()))
    return jsonify({"data": bundle_admin_payload(updated)})


@bp.patch("/bundles/<int:bundle_id>")
@admin_required()
def patch_bundle(bundle_id: int):
    """تحديث جزئي سريع (إخفاء/تفعيل/ترتيب) دون إعادة فتح النموذج."""
    bundle = admin_service.get_bundle_or_404(bundle_id)
    updated = admin_service.patch_bundle(
        bundle, load_json_or_400(BundleAdminUpdateSchema())
    )
    return jsonify({"data": bundle_admin_payload(updated)})


@bp.delete("/bundles/<int:bundle_id>")
@admin_required()
def delete_bundle(bundle_id: int):
    """إخفاء منطقي — تختفي من الموقع وتُعطَّل كوبونها دون مسح الطلبات."""
    bundle = admin_service.get_bundle_or_404(bundle_id)
    admin_service.delete_bundle(bundle)
    return jsonify({"data": {"id": bundle_id, "isActive": False}})


@bp.post("/bundles/<int:bundle_id>/move")
@admin_required()
def move_bundle(bundle_id: int):
    """إعادة ترتيب الباقة لأعلى/أسفل في قائمة الباقات العامة."""
    bundle = db.session.get(Bundle, bundle_id)
    if bundle is None:
        raise ApiError("الباقة غير موجودة", status_code=404)
    direction = load_json_or_400(BundleMoveSchema())["direction"]
    admin_service.move_bundle(bundle, direction)
    return jsonify({"data": {"moved": True}})


# ---------------------------------------------------------------------------
# المدونة / المقالات
# ---------------------------------------------------------------------------


@bp.get("/journal")
@admin_required()
def list_articles():
    """كل المقالات (منشورة ومخفية) — لإدارة محتوى المدونة."""
    articles = admin_service.list_admin_articles()
    return jsonify({"data": [journal_admin_payload(a) for a in articles]})


@bp.post("/journal")
@admin_required()
def create_article():
    article = admin_service.create_article(load_json_or_400(JournalWriteSchema()))
    return jsonify({"data": journal_admin_payload(article)}), 201


@bp.get("/journal/<int:article_id>")
@admin_required()
def get_article(article_id: int):
    article = admin_service.get_article_or_404(article_id)
    return jsonify({"data": journal_admin_payload(article)})


@bp.put("/journal/<int:article_id>")
@admin_required()
def update_article(article_id: int):
    article = admin_service.get_article_or_404(article_id)
    updated = admin_service.update_article(article, load_json_or_400(JournalWriteSchema()))
    return jsonify({"data": journal_admin_payload(updated)})


@bp.patch("/journal/<int:article_id>")
@admin_required()
def patch_article(article_id: int):
    """تحديث سريع — تمييز/نشر/إخفاء دون إعادة فتح النموذج."""
    article = admin_service.get_article_or_404(article_id)
    updated = admin_service.patch_article(
        article, load_json_or_400(JournalPatchSchema())
    )
    return jsonify({"data": journal_admin_payload(updated)})


@bp.delete("/journal/<int:article_id>")
@admin_required()
def delete_article(article_id: int):
    """إخفاء منطقي — يختفي المقال من المدونة دون فقد محتواه."""
    article = admin_service.get_article_or_404(article_id)
    admin_service.delete_article(article)
    return jsonify({"data": {"id": article_id, "isPublished": False}})