"""منطق المدونة — قراءة المقالات المنشورة فقط."""
from __future__ import annotations

from sqlalchemy import select

from app.core.errors import ApiError
from app.extensions import db
from app.models import JournalArticle


def list_articles() -> list[JournalArticle]:
    """المقالات المنشورة — المميز أولاً ثم الأحدث نزولاً بالتاريخ."""
    query = (
        select(JournalArticle)
        .where(JournalArticle.is_published.is_(True))
        .order_by(
            JournalArticle.is_featured.desc(),
            JournalArticle.publish_date.desc(),
            JournalArticle.id.desc(),
        )
    )
    return list(db.session.execute(query).scalars().all())


def get_article_or_404(slug: str) -> JournalArticle:
    article = db.session.execute(
        select(JournalArticle).where(
            JournalArticle.slug == slug, JournalArticle.is_published.is_(True)
        )
    ).scalars().first()
    if article is None:
        raise ApiError("المقال غير موجود", status_code=404, code="article_not_found")
    return article