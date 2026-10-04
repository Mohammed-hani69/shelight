"""منطق المراجعات: سرد وخلق وزيادة عدد "مفيد"."""
from __future__ import annotations

from sqlalchemy import select

from app.core.errors import ApiError
from app.core.pagination import paginate
from app.extensions import db
from app.models import Customer, Product, Review


def list_published(product_id: int, page_size: int | None = None) -> tuple[list[Review], dict]:
    """سرد المراجعات المنشورة لمنتج — الأحدث أولاً."""
    query = (
        select(Review)
        .where(Review.product_id == product_id, Review.is_published.is_(True))
        .order_by(Review.created_at.desc())
    )
    return paginate(query, page_size)


def create_review(
    product: Product, customer_id: int | None, data: dict, customer: Customer | None
) -> Review:
    """ينشئ مراجعة؛ مراجعات المستخدمين المسجلين توضع كـ verified."""
    author_name = (data.get("author_name") or "").strip()
    if not author_name and customer is not None:
        author_name = " ".join(part for part in (customer.first_name, customer.last_name) if part)
    if not author_name:
        raise ApiError("اسم المراجع مطلوب", code="author_name_required")

    review = Review(
        product_id=product.id,
        customer_id=customer_id,
        author_name=author_name,
        rating=data["rating"],
        title=(data.get("title") or "").strip(),
        body=data["body"].strip(),
        is_verified=customer is not None,
        is_published=True,
    )
    db.session.add(review)
    db.session.commit()
    return review


def increment_helpful(review_id: int) -> Review:
    """يزيد عدّاد "وجدت هذا مفيداً" — بلا ازدواج في التسجيل (مؤقّت)."""
    review = db.session.get(Review, review_id)
    if review is None:
        raise ApiError("المراجعة غير موجودة", status_code=404)
    review.helpful_count += 1
    db.session.commit()
    return review