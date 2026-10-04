from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import func, select

from app.core.errors import ApiError
from app.core.schema import load_json_or_400
from app.core.security import admin_required
from app.extensions import db
from app.models import Order, ShippingProviderSettings, WebhookEvent
from app.modules.shipping.schemas import BostaSettingsSchema, BostaTestConnectionSchema
from app.modules.shipping.service import ShippingService

bp = Blueprint("shipping", __name__, url_prefix="/admin/shipping")


@bp.get("/bosta")
@admin_required()
def get_bosta_settings():
    data = ShippingService.get_provider_settings("bosta")
    return jsonify({"data": data})


@bp.get("/bosta/overview")
@admin_required()
def bosta_overview():
    """ملخص شحنات Bosta المحلية وآخر أحداث webhook المسجلة."""
    settings = ShippingProviderSettings.query.filter_by(provider="bosta").first()
    page = max(request.args.get("page", 1, type=int), 1)
    page_size = min(max(request.args.get("page_size", 25, type=int), 1), 100)
    status = request.args.get("status")
    query = Order.query.filter(Order.shipping_provider == "bosta")
    if status:
        query = query.filter(Order.shipping_status == status)

    total_count = query.count()
    shipments = (
        query.order_by(Order.updated_at.desc(), Order.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    shipment_ids = [order.id for order in shipments]
    events_by_order: dict[int, WebhookEvent] = {}
    if shipment_ids:
        events = db.session.execute(
            select(WebhookEvent)
            .where(WebhookEvent.provider == "bosta", WebhookEvent.order_id.in_(shipment_ids))
            .order_by(WebhookEvent.created_at.desc(), WebhookEvent.id.desc())
        ).scalars()
        for event in events:
            if event.order_id not in events_by_order:
                events_by_order[event.order_id] = event

    all_bosta_orders = Order.query.filter(Order.shipping_provider == "bosta")
    delivered_count = all_bosta_orders.filter(Order.shipping_status == "delivered").count()
    in_transit_count = all_bosta_orders.filter(
        Order.shipping_status.in_(["picked_up", "out_for_delivery"])
    ).count()
    exception_count = all_bosta_orders.filter(
        Order.shipping_status.in_(
            [
                "exception",
                "failed",
                "lost",
                "damaged",
                "returning",
                "canceled",
                "terminated",
                "awaiting_action",
            ]
        )
    ).count()
    cod_unsettled = db.session.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.shipping_provider == "bosta",
            Order.shipping_status == "delivered",
            Order.payment_method == "cod",
            Order.payment_status == "pending",
        )
    ).scalar_one()
    delivered_value = db.session.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.shipping_provider == "bosta", Order.shipping_status == "delivered"
        )
    ).scalar_one()
    recent_events = (
        WebhookEvent.query.filter_by(provider="bosta")
        .order_by(WebhookEvent.created_at.desc(), WebhookEvent.id.desc())
        .limit(12)
        .all()
    )

    return jsonify(
        {
            "data": {
                "connection": {
                    "enabled": bool(settings and settings.enabled),
                    "apiConfigured": bool(settings and settings.api_key_encrypted),
                    "apiUrlConfigured": bool(current_app.config.get("BOSTA_API_URL")),
                    "webhookConfigured": bool(
                        current_app.config.get("BOSTA_WEBHOOK_AUTH_TOKEN")
                        and current_app.config.get("BOSTA_WEBHOOK_AUTH_HEADER")
                    ),
                },
                "summary": {
                    "shipmentCount": all_bosta_orders.count(),
                    "deliveredCount": delivered_count,
                    "inTransitCount": in_transit_count,
                    "exceptionCount": exception_count,
                    "deliveredOrderValue": float(delivered_value or 0),
                    "codAwaitingPaymentUpdate": float(cod_unsettled or 0),
                },
                "shipments": [
                    {
                        "orderNumber": order.order_number,
                        "shipmentId": order.shipping_provider_order_id,
                        "trackingNumber": order.tracking_number,
                        "status": order.shipping_status,
                        "orderStatus": order.status,
                        "paymentMethod": order.payment_method,
                        "paymentStatus": order.payment_status,
                        "total": float(order.total or 0),
                        "updatedAt": order.updated_at.isoformat() if order.updated_at else None,
                        "lastEvent": (
                            {
                                "stateCode": events_by_order[order.id].provider_state_code,
                                "stateName": events_by_order[order.id].provider_state_name,
                                "receivedAt": events_by_order[order.id].created_at.isoformat()
                                if events_by_order[order.id].created_at
                                else None,
                            }
                            if order.id in events_by_order
                            else None
                        ),
                    }
                    for order in shipments
                ],
                "recentEvents": [
                    {
                        "trackingNumber": event.tracking_number,
                        "shipmentId": event.provider_event_id,
                        "stateCode": event.provider_state_code,
                        "stateName": event.provider_state_name,
                        "status": event.internal_status,
                        "outcome": event.outcome,
                        "receivedAt": event.created_at.isoformat() if event.created_at else None,
                    }
                    for event in recent_events
                ],
                "pagination": {
                    "page": page,
                    "pageSize": page_size,
                    "total": total_count,
                    "pages": (total_count + page_size - 1) // page_size,
                },
            }
        }
    )


@bp.post("/bosta")
@admin_required()
def create_bosta_settings():
    payload = load_json_or_400(BostaSettingsSchema())
    record = ShippingService.upsert_settings("bosta", payload)
    return jsonify({"data": ShippingService.serialize_settings(record)}), 201


@bp.put("/bosta")
@admin_required()
def update_bosta_settings():
    payload = load_json_or_400(BostaSettingsSchema())
    record = ShippingService.upsert_settings("bosta", payload)
    return jsonify({"data": ShippingService.serialize_settings(record)})


@bp.post("/bosta/test")
@admin_required()
def test_bosta_connection():
    payload = load_json_or_400(BostaTestConnectionSchema(), partial=True)
    result = ShippingService.test_connection("bosta", payload)
    return jsonify({"data": result})


@bp.post("/bosta/enable")
@admin_required()
def enable_bosta():
    payload = request.get_json(silent=True) or {}
    enabled = bool(payload.get("enabled", True))
    settings = ShippingProviderSettings.query.filter_by(provider="bosta").first()
    if enabled and (settings is None or not settings.api_key_encrypted):
        raise ApiError("أضف مفتاح API قبل تفعيل الربط.", status_code=400)
    return jsonify({"data": ShippingService.enable("bosta", enabled)})


@bp.post("/bosta/disable")
@admin_required()
def disable_bosta():
    return jsonify({"data": ShippingService.enable("bosta", False)})


@bp.errorhandler(ApiError)
def handle_api_error(error: ApiError):
    return jsonify({"error": {"code": error.code or "api_error", "message": str(error)}}), error.status_code
