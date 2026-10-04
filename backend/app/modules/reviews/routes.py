"""روتات المراجعات."""
from __future__ import annotations

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.core.schema import load_json_or_400
from app.core.security import optional_active_customer_id
from app.extensions import db
from app.models import Customer
from app.modules.products.services import get_product_or_404
from app.modules.reviews import services as review_service
from app.modules.reviews.schemas import ReviewCreateSchema, ReviewOut

bp = Blueprint("reviews", __name__)


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