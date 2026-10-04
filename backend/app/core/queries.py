"""تحميل العلاقات مسبقاً — يمنع استعلام N+1 عند تصدير القوائم.

التصدير عبر marshmallow يقرأ `product.images` و`product.category` لكل عنصر،
وSQLAlchemy يُحمّل كل علاقة عند أول قراءة لها. في صفحة من 12 منتجاً
يعني ذلك 17 استعلاماً بدل استعلامين. الخيارات هنا تجعلها مجموعة واحدة.
"""
from __future__ import annotations

from sqlalchemy.orm import selectinload
from sqlalchemy.sql import Select

from app.models import Product


def with_product_relations(query: Select, *, details: bool = False) -> Select:
    """حمّل صور المنتج وفئته مسبقاً، واهتماماته في صفحة التفاصيل."""
    options = [selectinload(Product.images), selectinload(Product.category)]
    if details:
        options.append(selectinload(Product.concerns))
    return query.options(*options)