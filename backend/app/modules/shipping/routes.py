from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.core.errors import ApiError
from app.core.schema import load_json_or_400
from app.core.security import admin_required
from app.modules.shipping.schemas import BostaSettingsSchema, BostaTestConnectionSchema
from app.modules.shipping.service import ShippingService

bp = Blueprint("shipping", __name__, url_prefix="/admin/shipping")


@bp.get("/bosta")
@admin_required()
def get_bosta_settings():
    return jsonify({"data": ShippingService.get_provider_settings("bosta")})


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
    return jsonify({"data": ShippingService.enable("bosta", enabled)})


@bp.post("/bosta/disable")
@admin_required()
def disable_bosta():
    return jsonify({"data": ShippingService.enable("bosta", False)})


@bp.errorhandler(ApiError)
def handle_api_error(error: ApiError):
    return jsonify({"error": {"code": error.code or "api_error", "message": str(error)}}), error.status_code
