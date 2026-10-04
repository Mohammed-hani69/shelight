"""روتات تحليلات الرحلة — كلها محمية بـ @admin_required."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.core.security import admin_required
from app.modules.analytics import services as analytics_service
from app.modules.tracking import services as tracking_service

bp = Blueprint("analytics", __name__, url_prefix="/admin/analytics")


def _days(default: int = 30) -> int:
    try:
        return max(1, min(int(request.args.get("days", default)), 365))
    except (TypeError, ValueError):
        return default


def _limit(default: int = 50) -> int:
    try:
        return max(1, min(int(request.args.get("limit", default)), 200))
    except (TypeError, ValueError):
        return default


@bp.get("/overview")
@admin_required()
def overview():
    """أرقام نظرة عامة: زوّار، جلسات، تحويل، سلال متروكة."""
    return jsonify({"data": analytics_service.overview(_days())})


@bp.get("/funnel")
@admin_required()
def funnel():
    """مسار التحويل من الزيارة إلى الشراء."""
    return jsonify({"data": analytics_service.funnel(_days())})


@bp.get("/abandoned-carts")
@admin_required()
def abandoned_carts():
    """السلال المتروكة والمستعادة والمحوَّلة."""
    return jsonify({"data": analytics_service.abandoned_carts(_days(), _limit())})


@bp.get("/visitors")
@admin_required()
def visitors():
    """الزوار النشطون خلال المدة."""
    return jsonify({"data": analytics_service.list_visitors(_days(), _limit())})


@bp.get("/customers/<int:customer_id>/timeline")
@admin_required()
def customer_timeline(customer_id: int):
    """الخط الزمني الكامل لعميل."""
    return jsonify({"data": analytics_service.customer_timeline(customer_id, _limit(200))})


@bp.get("/visitors/<visitor_id>/timeline")
@admin_required()
def visitor_timeline(visitor_id: str):
    """الخط الزمني لزائر مجهول."""
    return jsonify({"data": analytics_service.visitor_timeline(visitor_id, _limit(200))})


@bp.post("/run-abandonment")
@admin_required()
def run_abandonment():
    """يشغّل يدوياً فحص السلال المتروكة — idempotent."""
    return jsonify({"data": {"abandoned": tracking_service.detect_abandoned_carts()}})
