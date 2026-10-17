from __future__ import annotations

from decimal import Decimal

from flask import Blueprint, current_app, jsonify, request
from marshmallow import Schema, ValidationError, fields, validate
from sqlalchemy import func, select

from app.core.errors import ApiError
from app.core.security import admin_required
from app.extensions import db
from app.models import Order, ShippingProviderSettings
from app.modules.shipping.sariee import SarieeClient, extract_order_id
from app.modules.shipping.service import decrypt_secret, encrypt_secret, mask_secret

bp = Blueprint("shipping", __name__, url_prefix="/admin/shipping/sariee")


class SarieeSettingsSchema(Schema):
    apiKey = fields.Str(load_default="", validate=validate.Length(max=500))
    pickupLocationId = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    defaultWeightKg = fields.Float(required=True, validate=validate.Range(min=0.01, max=1000))
    enabled = fields.Bool(load_default=False)


def _settings_record() -> ShippingProviderSettings | None:
    return ShippingProviderSettings.query.filter_by(provider="sariee").first()


def _settings_payload(record: ShippingProviderSettings | None) -> dict:
    api_key = decrypt_secret(record.api_key_encrypted) if record else None
    return {
        "provider": "sariee",
        "enabled": bool(record and record.enabled),
        "apiConfigured": bool(api_key),
        "apiKeyMasked": mask_secret(api_key) if api_key else "",
        "pickupLocationId": record.default_pickup_location if record else "",
        "defaultWeightKg": float(record.default_weight_kg) if record else 1.0,
    }


@bp.get("/settings")
@admin_required()
def get_settings():
    return jsonify({"data": _settings_payload(_settings_record())})


@bp.put("/settings")
@admin_required()
def save_settings():
    try:
        payload = SarieeSettingsSchema().load(request.get_json(silent=True) or {})
    except ValidationError as error:
        raise ApiError(
            "إعدادات سريع غير صالحة",
            status_code=400,
            code="invalid_sariee_settings",
            fields=error.messages,
        ) from error

    pickup_location_id = payload["pickupLocationId"].strip()
    if not pickup_location_id:
        raise ApiError(
            "Pickup Location ID مطلوب.",
            status_code=400,
            code="missing_pickup_location",
        )

    record = _settings_record()
    if record is None:
        record = ShippingProviderSettings(provider="sariee")
    api_key = payload["apiKey"].strip()
    if api_key:
        record.api_key_encrypted = encrypt_secret(api_key)
    elif record.api_key_encrypted is None and payload["enabled"]:
        raise ApiError("أدخل مفتاح API قبل تفعيل الربط.", status_code=400, code="missing_api_key")
    record.default_pickup_location = pickup_location_id
    record.default_weight_kg = Decimal(str(payload["defaultWeightKg"]))
    record.enabled = payload["enabled"]
    db.session.add(record)
    db.session.commit()
    return jsonify({"data": _settings_payload(record)})


@bp.get("/orders")
@admin_required()
def list_sariee_orders():
    page = max(request.args.get("page", 1, type=int), 1)
    page_size = min(max(request.args.get("page_size", 25, type=int), 1), 100)
    query = select(Order).where(Order.shipping_provider == "sariee").order_by(
        Order.updated_at.desc(), Order.id.desc()
    )
    total = db.session.execute(
        select(func.count()).select_from(query.subquery())
    ).scalar_one()
    orders = db.session.execute(
        query.offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()
    return jsonify(
        {
            "data": [
                {
                    "orderNumber": order.order_number,
                    "sarieeOrderId": order.shipping_provider_order_id,
                    "trackingNumber": order.tracking_number,
                    "status": order.shipping_status,
                    "total": float(order.total),
                    "updatedAt": order.updated_at.isoformat() if order.updated_at else None,
                }
                for order in orders
            ],
            "meta": {
                "page": page,
                "pageSize": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size,
            },
        }
    )


def _client_or_error() -> SarieeClient:
    record = _settings_record()
    api_key = decrypt_secret(record.api_key_encrypted) if record else None
    if record is None or not record.enabled or not api_key:
        raise ApiError(
            "احفظ مفتاح سريع وفعّل الربط من إعدادات الشحن أولاً.",
            status_code=400,
            code="sariee_not_configured",
        )
    return SarieeClient(
        api_key=api_key,
        base_url=current_app.config["SARIEE_API_URL"],
    )


@bp.post("/orders/<order_number>/draft")
@admin_required()
def create_sariee_draft(order_number: str):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        raise ApiError("الطلب غير موجود.", status_code=404, code="order_not_found")
    if order.shipping_provider_order_id:
        raise ApiError("تم إنشاء شحنة لهذا الطلب بالفعل.", status_code=409, code="shipment_exists")

    settings = _settings_record()
    client = _client_or_error()
    is_cod = order.payment_method == "cod"
    payload = {
        "customer_name": f"{order.shipping_first_name} {order.shipping_last_name}".strip(),
        "customer_phone": order.shipping_phone,
        "customer_address": order.shipping_address,
        "governorate": order.shipping_governorate,
        "city": order.shipping_city,
        "total_amount": float(order.total),
        "cod_amount": float(order.total) if is_cod else 0,
        "is_cod": is_cod,
        "cod_includes_shipping": True,
        "weight_kg": float(settings.default_weight_kg),
        "items_count": sum(item.quantity for item in order.items),
        "notes": order.notes or "",
    }
    response = client.create_order(payload)
    external_id = extract_order_id(response)
    if external_id is None:
        raise ApiError(
            "أنشأت سريع الطلب لكن لم يرجع معرّف المسودة المتوقع؛ راجع لوحة سريع قبل إعادة المحاولة.",
            status_code=502,
            code="sariee_order_id_missing",
        )

    order.shipping_provider = "sariee"
    order.shipping_provider_order_id = external_id
    order.shipping_status = "draft"
    db.session.commit()
    return jsonify({"data": {"orderNumber": order.order_number, "sarieeOrderId": external_id, "status": "draft"}}), 201


@bp.post("/orders/<order_number>/activate")
@admin_required()
def activate_sariee_order(order_number: str):
    order = Order.query.filter_by(
        order_number=order_number,
        shipping_provider="sariee",
    ).first()
    if order is None or not order.shipping_provider_order_id:
        raise ApiError("لا توجد مسودة سريع لهذا الطلب.", status_code=404, code="sariee_draft_not_found")
    if order.shipping_status != "draft":
        raise ApiError("لا يمكن تفعيل هذه الشحنة لأنها ليست مسودة.", status_code=409, code="sariee_order_not_draft")

    settings = _settings_record()
    if settings is None or not settings.default_pickup_location:
        raise ApiError("أدخل Pickup Location ID في إعدادات سريع أولاً.", status_code=400, code="missing_pickup_location")
    response = _client_or_error().activate_order(
        order.shipping_provider_order_id,
        settings.default_pickup_location,
    )
    order.shipping_status = "active"
    tracking_number = response.get("tracking_number") or response.get("trackingNumber")
    if isinstance(tracking_number, (str, int)):
        order.tracking_number = str(tracking_number)
    db.session.commit()
    return jsonify(
        {
            "data": {
                "orderNumber": order.order_number,
                "sarieeOrderId": order.shipping_provider_order_id,
                "trackingNumber": order.tracking_number,
                "status": order.shipping_status,
            }
        }
    )


@bp.errorhandler(ApiError)
def handle_shipping_error(error: ApiError):
    return jsonify({"error": {"code": error.code, "message": error.message}}), error.status_code
