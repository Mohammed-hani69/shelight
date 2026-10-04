"""روتات الكتالوج: المنتجات، الفئات، الاهتمامات، الوسوم."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.i18n import lang_from_args, localized
from app.core.pagination import paginate
from app.core.queries import with_product_relations
from app.extensions import db
from app.models import Category, Concern, Product
from app.modules.products import services
from app.modules.products.schemas import (
    ConcernBriefOut,
    ProductListOut,
    ProductOut,
)

bp = Blueprint("products", __name__)


def _dump_with_stats(products: list[Product], schema, lang: str):
    """يصدّر المنتجات ثم يحقن التقييم وعدد المراجعات دفعة واحدة."""
    payload = schema(many=True, lang=lang).dump(products)
    stats = services.review_stats(products)
    for item, product in zip(payload, products):
        avg, count = stats.get(product.id, (0.0, 0))
        item["rating"] = avg if count else 0.0
        item["reviewCount"] = count
    return payload


def _detail_payload(product: Product, lang: str) -> dict:
    """تفاصيل منتج واحد مع تقييمه — نفس منطق القائمة بلا تكرار الكود."""
    payload = ProductOut(lang=lang).dump(product)
    avg, count = services.review_stats([product]).get(product.id, (0.0, 0))
    payload["rating"] = avg if count else 0.0
    payload["reviewCount"] = count
    return payload


def _category_payload(category: Category, lang: str) -> dict:
    """تحميل يدوي متكرر — يفلتر الأبناء النشطين فقط."""
    return {
        "id": str(category.id),
        "slug": category.slug,
        "name": localized(category, "name", lang),
        "nameAr": category.name_ar,
        "description": localized(category, "description", lang),
        "image": category.image_url,
        "isFeatured": category.is_featured,
        "isActive": category.is_active,
        "sortOrder": category.sort_order,
        "children": [
            _category_payload(child, lang) for child in category.children if child.is_active
        ],
    }


@bp.get("/products")
def list_products():
    """قوائم المنتجات مع فرز وتصفية وبحث وتوزيع صفحات."""
    lang = lang_from_args(request.args)
    filters = {
        "category_slug": request.args.get("category"),
        "search": request.args.get("search"),
        "tag": request.args.get("tag"),
        "featured": request.args.get("featured") == "true",
        "bestseller": request.args.get("bestseller") == "true",
        "sort": request.args.get("sort", "newest"),
    }
    items, meta = services.list_products(filters)
    return jsonify({"data": _dump_with_stats(items, ProductListOut, lang), "meta": meta})


@bp.get("/products/tags")
def list_tags():
    """كل وسوم المنتجات المتاحة للمرشحات."""
    return jsonify({"data": services.list_tags()})


@bp.get("/products/id/<int:product_id>")
def get_product_by_id(product_id: int):
    """تفاصيل منتج بالمعرّف الرقمي — لصفحات تعتمد على معرّفات (الأمنيات)."""
    product = services.get_product_by_id_or_404(product_id)
    return jsonify({"data": _detail_payload(product, lang_from_args(request.args))})


@bp.get("/products/<slug>")
def get_product(slug: str):
    """تفاصيل منتج واحد."""
    product = services.get_product_or_404(slug)
    return jsonify({"data": _detail_payload(product, lang_from_args(request.args))})


@bp.get("/categories")
def list_categories():
    """شجرة الفئات النشطة (سرد الفرعية داخل children).

    يدعم `?featured=true` لإظهار الأقسام المميزة فقط التي يتحكم فيها المدير
    (كما تظهر في الرئيسية وقائمة التنقل).
    """
    lang = lang_from_args(request.args)
    query = select(Category).where(Category.is_active.is_(True), Category.parent_id.is_(None))
    if request.args.get("featured") == "true":
        query = query.where(Category.is_featured.is_(True))
    roots = (
        db.session.execute(
            query.options(selectinload(Category.children)).order_by(Category.sort_order)
        )
        .scalars()
        .unique()
        .all()
    )
    return jsonify({"data": [_category_payload(root, lang) for root in roots]})


@bp.get("/concerns")
def list_concerns():
    """اهتمامات البشرة/الشعر المتاحة (تسوق حسب الاهتمام)."""
    lang = lang_from_args(request.args)
    concerns = (
        db.session.execute(select(Concern).order_by(Concern.name_en))
        .scalars()
        .all()
    )
    return jsonify({"data": ConcernBriefOut(many=True, lang=lang).dump(concerns)})


@bp.get("/categories/<slug>/products")
def products_in_category(slug: str):
    """منتجات فئة محددة — النسخة المعتمدة على الـ slug."""
    category = (
        db.session.execute(
            select(Category).where(Category.slug == slug, Category.is_active.is_(True))
        )
        .scalar_one_or_none()
    )
    if category is None:
        return jsonify({"data": [], "meta": None})

    lang = lang_from_args(request.args)
    query = with_product_relations(
        select(Product)
        .where(Product.is_active.is_(True), Product.category_id == category.id)
        .order_by(Product.created_at.desc(), Product.id.asc())
    )
    # نفس أداة الترقيم التي تستخدمها بقية القوائم بدل بناء meta يدوياً.
    items, meta = paginate(query)
    return jsonify({"data": _dump_with_stats(items, ProductListOut, lang), "meta": meta})