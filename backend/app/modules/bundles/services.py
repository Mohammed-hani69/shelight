"""منطق الباقات: قراءة الباقات النشطة مع أعضائها في استعلام واحد."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.extensions import db
from app.models import Bundle, BundleItem, Product


def _with_items(query):
    """تحميل الأعضاء ومنتجاتهم وصورهم وفئاتهم مسبقاً لتفادي استعلام N+1.

    المسار مكتوب كاملاً لأن المنتج هنا ليس جذر الاستعلام بل عضو متداخل:
    `Bundle.items.product` — والخيار يُبنى من الجذر نزولاً.
    """
    return query.options(
        selectinload(Bundle.items).selectinload(BundleItem.product).selectinload(Product.images),
        selectinload(Bundle.items).selectinload(BundleItem.product).selectinload(Product.category),
    )


def list_bundles() -> list[Bundle]:
    """كل الباقات النشطة مرتّبة كما رتّبها صاحبها."""
    query = select(Bundle).where(Bundle.is_active.is_(True)).order_by(Bundle.sort_order, Bundle.id)
    return list(db.session.execute(_with_items(query)).scalars().unique().all())


def get_bundle_or_404(slug: str) -> Bundle:
    """باقة واحدة بالـ slug."""
    query = select(Bundle).where(Bundle.slug == slug, Bundle.is_active.is_(True))
    bundle = db.session.execute(_with_items(query)).scalars().unique().first()
    if bundle is None:
        raise ApiError("الباقة غير موجودة", status_code=404, code="bundle_not_found")
    return bundle
