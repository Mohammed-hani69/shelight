"""منطق الكتالوج: قوائم، بحث، فرز، تصفية، وتفاصيل المنتج."""
from __future__ import annotations

from sqlalchemy import func, or_, select

from app.core.errors import ApiError
from app.core.pagination import paginate
from app.core.queries import with_product_relations
from app.extensions import db
from app.models import Product, Review

SORT_OPTIONS = {
    "price-asc": (Product.price.asc(),),
    "price-desc": (Product.price.desc(),),
    # كل منتجات البذرة تُنشأ في نفس اللحظة، فنضيف `id` لكسر التعادل —
    # بدونه يصبح ترتيب الصفحة غير حتمي ويتغيّر بين الطلبات.
    "newest": (Product.created_at.desc(), Product.id.asc()),
    "name": (Product.name_en.asc(),),
    "featured": (Product.is_featured.desc(),),
}

# خيارات الفرز التي تحتاج إحصاءات المراجعات، فهي ليست أعمدة على Product.
# نستخدم استعلاماً فرعياً مربوطاً (LEFT JOIN) حتى لا تُستبعد المنتجات بلا مراجعات.
_REVIEW_STATS_SUBQUERY = (
    select(
        Review.product_id.label("product_id"),
        func.avg(Review.rating).label("avg_rating"),
        func.count(Review.id).label("review_count"),
    )
    .where(Review.is_published.is_(True))
    .group_by(Review.product_id)
    .subquery()
)

_STATS_JOIN = Product.id == _REVIEW_STATS_SUBQUERY.c.product_id


def _apply_sort(query, sort: str):
    """يطبّق الفرز المطلوب مع دعم الترتيبات المبنية على إحصاءات المراجعات."""
    if sort == "rating":
        return (
            query.outerjoin(_REVIEW_STATS_SUBQUERY, _STATS_JOIN)
            .order_by(
                func.coalesce(_REVIEW_STATS_SUBQUERY.c.avg_rating, 0).desc(),
                Product.id.asc(),
            )
        )
    if sort == "popularity":
        return (
            query.outerjoin(_REVIEW_STATS_SUBQUERY, _STATS_JOIN)
            .order_by(
                func.coalesce(_REVIEW_STATS_SUBQUERY.c.review_count, 0).desc(),
                Product.is_bestseller.desc(),
                Product.id.asc(),
            )
        )
    return query.order_by(*SORT_OPTIONS.get(sort, SORT_OPTIONS["newest"]))


def _like_contains(value: str) -> str:
    """نمط بحث يتح فيه `%` و `_` كنص حرفي لا كبدائل.

    بدون تهريب، `?search=%` كان يُرجع كل المنتجات: بديل في كل بحث
    يملأ الصفحة بلا فائدة ويستهلك قاعدة البيانات.
    """
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _like_escaped(column, value: str):
    return column.like(_like_contains(value), escape="\\")


def list_products(filters: dict) -> tuple[list[Product], dict]:
    """يبني استعلام القوائم بالفرز والتصفية المطلوبة ويعيد صفحة."""
    query = with_product_relations(select(Product).where(Product.is_active.is_(True)))

    category_slug = filters.get("category_slug")
    if category_slug:
        # يضمن ألا تظهر منتجات فئة مخفية من قِبل المدير (إخفاء شامل بالموقع).
        query = query.where(
            Product.category.has(slug=category_slug, is_active=True)
        )

    search = (filters.get("search") or "").strip()
    if search:
        query = query.where(
            or_(
                _like_escaped(func.lower(Product.name_en), search.lower()),
                _like_escaped(func.lower(Product.name_ar), search.lower()),
                _like_escaped(func.lower(Product.short_description_en), search.lower()),
            )
        )

    tag = filters.get("tag")
    if tag:
        query = query.where(_like_escaped(Product.tags, tag.strip()))

    if filters.get("featured"):
        query = query.where(Product.is_featured.is_(True))
    if filters.get("bestseller"):
        query = query.where(Product.is_bestseller.is_(True))

    query = _apply_sort(query, filters.get("sort", "newest"))

    return paginate(query, filters.get("page_size"))


def get_product_or_404(slug: str) -> Product:
    """يعيد المنتج النشط أو يرمي 404."""
    product = db.session.execute(
        with_product_relations(select(Product).where(Product.slug == slug, Product.is_active.is_(True)), details=True)
    ).scalar_one_or_none()
    if product is None:
        raise ApiError("المنتج غير موجود", status_code=404)
    return product


def get_product_by_id_or_404(product_id: int) -> Product:
    """يعيد المنتج النشط بالمعرّف الرقمي — للأمنيات وعمليات الحذف."""
    product = db.session.execute(
        with_product_relations(select(Product).where(Product.id == product_id, Product.is_active.is_(True)), details=True)
    ).scalar_one_or_none()
    if product is None:
        raise ApiError("المنتج غير موجود", status_code=404)
    return product


def review_stats(products: list[Product]) -> dict[int, tuple[float, int]]:
    """متوسط التقييم وعدد المراجعات المنشورة لكل منتج — دفعة واحدة بلا N+1.

    يعيد {product_id: (متوسط تقييم مقرب لرقم عشري، عدد المراجعات)}.
    """
    if not products:
        return {}
    product_ids = [p.id for p in products]
    rows = db.session.execute(
        select(
            Review.product_id, func.avg(Review.rating), func.count(Review.id)
        )
        .where(Review.product_id.in_(product_ids), Review.is_published.is_(True))
        .group_by(Review.product_id)
    ).all()
    return {
        pid: (round(float(avg or 0.0), 1), int(count or 0)) for pid, avg, count in rows
    }


def list_tags() -> list[str]:
    """وسوم فريدة مرتبة من كل المنتجات النشطة."""
    rows = db.session.execute(
        select(Product.tags).where(Product.is_active.is_(True))
    ).scalars().all()
    tags = {t.strip() for raw in rows if raw for t in raw.split(",") if t.strip()}
    return sorted(tags)