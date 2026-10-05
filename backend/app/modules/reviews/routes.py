"""روتات المراجعات."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import Schema, ValidationError, fields
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.core.pagination import paginate
from app.core.schema import load_json_or_400
from app.core.security import admin_required, optional_active_customer_id
from app.extensions import db
from app.models import Customer, Product, Review
from app.modules.products.services import get_product_or_404
from app.modules.reviews import services as review_service
from app.modules.reviews.schemas import ReviewCreateSchema, ReviewOut

bp = Blueprint("reviews", __name__)
admin_bp = Blueprint("reviews_admin", __name__, url_prefix="/admin/reviews")


class ReviewModerationSchema(Schema):
    isPublished = fields.Bool()
    showOnHome = fields.Bool()


@bp.get("/products/<slug>/reviews")
def list_reviews(slug: str):
    """مراجعات منتج منشورة فقط مع توزيع صفحات."""
    product = get_product_or_404(slug)
    items, meta = review_service.list_published(product.id)
    return jsonify({"data": ReviewOut(many=True).dump(items), "meta": meta})


@bp.post("/products/<slug>/reviews")
@jwt_required(optional=True)
def add_review(slug: str):
    """إضافة مراجعة — مسموح للضيوف، والمراجعات من الأعضاء تُعلَّم verified."""
    product = get_product_or_404(slug)
    # الحساب الموقوف لا يُعدّ عضواً: توكنه يمرّ لكن لا يستحق ختم "مشترٍ موثّق".
    customer_id = optional_active_customer_id()
    customer = db.session.get(Customer, customer_id) if customer_id else None
    data = load_json_or_400(ReviewCreateSchema())
    review = review_service.create_review(product, customer_id, data, customer)
    review_out = ReviewOut().dump(review)
    return jsonify({"data": review_out}), 201


@bp.post("/reviews/<int:review_id>/helpful")
def mark_helpful(review_id: int):
    """زيادة عدّاد المراجعة المفيدة — لا يتطلب دخولاً."""
    review = review_service.increment_helpful(review_id)
    return jsonify({"data": {"id": str(review.id), "helpfulCount": review.helpful_count}})


@bp.get("/reviews/homepage")
def list_homepage_reviews():
    """التقييمات المنشورة التي اختار المدير إبرازها على الصفحة الرئيسية."""
    reviews = db.session.execute(
        select(Review)
        .where(Review.is_published.is_(True), Review.show_on_home.is_(True))
        .options(selectinload(Review.product))
        .order_by(Review.created_at.desc())
        .limit(12)
    ).scalars().all()
    return jsonify(
        {
            "data": [
                {
                    **ReviewOut().dump(review),
                    "productName": (review.product.name_ar or review.product.name_en)
                    if review.product
                    else "",
                }
                for review in reviews
            ]
        }
    )


@admin_bp.get("/overview")
@admin_required()
def review_overview():
    published = Review.is_published.is_(True)
    total_reviews = db.session.execute(select(func.count(Review.id))).scalar_one()
    published_reviews = db.session.execute(
        select(func.count(Review.id)).where(published)
    ).scalar_one()
    average_rating = db.session.execute(
        select(func.avg(Review.rating)).where(published)
    ).scalar_one()
    distribution_rows = db.session.execute(
        select(Review.rating, func.count(Review.id))
        .where(published)
        .group_by(Review.rating)
    ).all()
    distribution = {rating: count for rating, count in distribution_rows}
    product_rows = db.session.execute(
        select(
            Product.id,
            Product.slug,
            Product.name_ar,
            Product.name_en,
            func.avg(Review.rating).label("average_rating"),
            func.count(Review.id).label("review_count"),
        )
        .join(Review, Review.product_id == Product.id)
        .where(Review.is_published.is_(True))
        .group_by(Product.id)
        .order_by(func.avg(Review.rating).desc(), func.count(Review.id).desc())
    ).all()
    product_performance = [
        {
            "productId": str(row.id),
            "slug": row.slug,
            "name": row.name_ar or row.name_en,
            "averageRating": round(float(row.average_rating or 0), 2),
            "reviewCount": int(row.review_count),
        }
        for row in product_rows
    ]
    pending_reviews = db.session.execute(
        select(func.count(Review.id)).where(Review.is_published.is_(False))
    ).scalar_one()
    return jsonify(
        {
            "data": {
                "totalReviews": int(total_reviews),
                "publishedReviews": int(published_reviews),
                "pendingReviews": int(pending_reviews),
                "homepageReviews": int(
                    db.session.execute(
                        select(func.count(Review.id)).where(
                            Review.is_published.is_(True), Review.show_on_home.is_(True)
                        )
                    ).scalar_one()
                ),
                "averageRating": round(float(average_rating or 0), 2),
                "distribution": {str(star): int(distribution.get(star, 0)) for star in range(1, 6)},
                "products": product_performance,
            }
        }
    )


@admin_bp.get("")
@admin_required()
def list_admin_reviews():
    query = select(Review).options(selectinload(Review.product)).order_by(Review.created_at.desc())
    published = request.args.get("published")
    if published in {"true", "false"}:
        query = query.where(Review.is_published.is_(published == "true"))
    product_id = request.args.get("product_id", type=int)
    if product_id:
        query = query.where(Review.product_id == product_id)
    items, meta = paginate(query, 25)
    return jsonify(
        {
            "data": [
                {
                    **ReviewOut().dump(review),
                    "productId": str(review.product_id),
                    "productName": (review.product.name_ar or review.product.name_en)
                    if review.product
                    else "منتج محذوف",
                    "productSlug": review.product.slug if review.product else "",
                    "isPublished": review.is_published,
                    "showOnHome": review.show_on_home,
                }
                for review in items
            ],
            "meta": meta,
        }
    )


@admin_bp.patch("/<int:review_id>")
@admin_required()
def moderate_review(review_id: int):
    review = db.session.get(Review, review_id)
    if review is None:
        raise ApiError("التقييم غير موجود", status_code=404)
    try:
        data = ReviewModerationSchema().load(request.get_json(silent=True) or {})
    except ValidationError as error:
        raise ApiError("حالة النشر غير صالحة", status_code=400) from error
    if not data:
        raise ApiError("حدد التغيير المطلوب", status_code=400)
    if "isPublished" in data:
        review.is_published = data["isPublished"]
        if not review.is_published:
            review.show_on_home = False
    if "showOnHome" in data:
        if data["showOnHome"] and not review.is_published:
            raise ApiError("انشر التقييم قبل إظهاره في الصفحة الرئيسية.", status_code=400)
        review.show_on_home = data["showOnHome"]
    db.session.commit()
    return jsonify(
        {
            "data": {
                "id": str(review.id),
                "isPublished": review.is_published,
                "showOnHome": review.show_on_home,
            }
        }
    )