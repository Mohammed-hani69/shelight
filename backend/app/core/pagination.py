"""أداة توحيدية لتوزيع النتائج عبر الصفحات."""
from __future__ import annotations

from typing import Any

from flask import current_app, request
from sqlalchemy.sql import Select

from app.extensions import db

MAX_PAGE_SIZE = 100


def default_page_size() -> int:
    """حجم الصفحة الافتراضي — من الإعدادات ليحيد في كل مسارات الـ API."""
    return int(current_app.config["PAGINATION_PAGE_SIZE"])


def page_params(default_size: int | None = None) -> tuple[int, int]:
    """يقرأ page و size من الاستعلام مع حدود آمنة.

    يُقبل `page_size` كمرادف لـ `size` لأن الواجهة ترسله في الروابط،
    وكلمة `size` وحدها كانت تُتجاهل بصمت فتتجاهل الواجهة الترقيم.
    """
    fallback = default_size if default_size is not None else default_page_size()
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    raw_size = request.args.get("size", request.args.get("page_size"))
    try:
        size = max(1, min(int(raw_size), MAX_PAGE_SIZE)) if raw_size is not None else fallback
    except (TypeError, ValueError):
        size = fallback
    return page, size


def paginate(query: Select, default_size: int | None = None) -> tuple[list[Any], dict]:
    """يوزّع استعلام SQLAlchemy 2.0 (Select) ويعيد (العناصر، بيانات التعريف).

    meta:
        page, pageSize, total, totalPages, hasNextPage
    """
    page, size = page_params(default_size)
    paged = db.paginate(query, page=page, per_page=size, error_out=False)
    return (
        list(paged.items),
        {
            "page": paged.page,
            "pageSize": paged.per_page,
            "total": paged.total,
            "totalPages": paged.pages,
            "hasNextPage": paged.has_next,
        },
    )