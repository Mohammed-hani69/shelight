from __future__ import annotations

import base64
import hashlib
from typing import Any

from flask import current_app
from cryptography.fernet import Fernet

from app.extensions import db
from app.models import ShippingProviderSettings


def _derived_key() -> bytes:
    secret = current_app.config.get("SECRET_KEY") or "shelight-default-secret-key"
    return base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())


def encrypt_secret(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    return Fernet(_derived_key()).encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_secret(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    return Fernet(_derived_key()).decrypt(value.encode("utf-8")).decode("utf-8")


def mask_secret(value: str | None, keep_last: int = 4) -> str:
    if value is None or value == "":
        return "••••••••••••"
    cleaned = value.strip()
    if len(cleaned) <= keep_last:
        return "••••••••••••"
    visible = cleaned[-keep_last:]
    hidden = "•" * max(4, len(cleaned) - keep_last)
    return f"{hidden}{visible}"


class ShippingService:
    """خدمة مركزية لإدارة إعدادات المزودات والشحن.

    من خلال هذه الخدمة نضمن عدم نشر تفاصيل Bosta داخل الواجهة، وعدم تمكين
    إعدادات مزود غير موجود فعلياً عبر نفس نقطة API.
    """

    @staticmethod
    def get_provider_settings(provider: str = "bosta") -> dict[str, Any]:
        record = ShippingProviderSettings.query.filter_by(provider=provider).first()
        if record is None:
            return {
                "provider": provider,
                "enabled": False,
                "environment": "sandbox",
                "apiConfigured": False,
                "defaultPickupLocation": None,
                "defaultDeliveryType": None,
                "defaultPackageType": None,
                "defaultShippingFee": 0,
                "apiKeyMasked": "",
                "clientIdMasked": "",
                "secretMasked": "",
            }
        return ShippingService.serialize_settings(record)

    @staticmethod
    def serialize_settings(record: ShippingProviderSettings) -> dict[str, Any]:
        return {
            "id": record.id,
            "provider": record.provider,
            "enabled": record.enabled,
            "environment": record.environment,
            "apiConfigured": bool(record.api_key_encrypted),
            "defaultPickupLocation": record.default_pickup_location,
            "defaultDeliveryType": record.default_delivery_type,
            "defaultPackageType": record.default_package_type,
            "defaultShippingFee": float(record.default_shipping_fee or 0),
            "apiKeyMasked": mask_secret(decrypt_secret(record.api_key_encrypted)),
            "createdAt": record.created_at.isoformat() if record.created_at else None,
            "updatedAt": record.updated_at.isoformat() if record.updated_at else None,
        }

    @staticmethod
    def upsert_settings(provider: str, data: dict[str, Any]) -> ShippingProviderSettings:
        record = ShippingProviderSettings.query.filter_by(provider=provider).first()
        if record is None:
            record = ShippingProviderSettings(provider=provider)

        record.enabled = bool(data.get("enabled", record.enabled))
        record.environment = data.get("environment") or record.environment or "sandbox"
        record.default_pickup_location = data.get("defaultPickupLocation")
        record.default_delivery_type = data.get("defaultDeliveryType")
        record.default_package_type = data.get("defaultPackageType")
        record.default_shipping_fee = data.get("defaultShippingFee") or record.default_shipping_fee or 0

        api_key = data.get("apiKey")
        if api_key is not None and api_key != "":
            record.api_key_encrypted = encrypt_secret(api_key)
        elif "api_key_encrypted" in data and data["api_key_encrypted"] is None:
            record.api_key_encrypted = None

        client_id = data.get("clientId")
        if client_id is not None and client_id != "":
            record.client_id_encrypted = encrypt_secret(client_id)
        elif "client_id_encrypted" in data and data["client_id_encrypted"] is None:
            record.client_id_encrypted = None

        secret = data.get("secret")
        if secret is not None and secret != "":
            record.secret_encrypted = encrypt_secret(secret)
        elif "secret_encrypted" in data and data["secret_encrypted"] is None:
            record.secret_encrypted = None

        db.session.add(record)
        db.session.commit()
        return record

    @staticmethod
    def enable(provider: str = "bosta", enabled: bool = True) -> dict[str, Any]:
        record = ShippingProviderSettings.query.filter_by(provider=provider).first()
        if record is None:
            record = ShippingProviderSettings(provider=provider, enabled=enabled)
            db.session.add(record)
        else:
            record.enabled = enabled
        db.session.commit()
        return ShippingService.serialize_settings(record)

    @staticmethod
    def test_connection(provider: str = "bosta", override: dict[str, Any] | None = None) -> dict[str, Any]:
        from app.modules.shipping.bosta.service import BostaProvider

        settings = ShippingProviderSettings.query.filter_by(provider=provider).first()
        if settings is None and override is None:
            return {"ok": False, "status": "not_configured", "message": "Bosta is not configured yet."}

        payload = {
            "enabled": settings.enabled if settings else True,
            "environment": settings.environment if settings else "sandbox",
            "apiKey": override.get("apiKey") if override else decrypt_secret(settings.api_key_encrypted),
            "clientId": override.get("clientId") if override else decrypt_secret(settings.client_id_encrypted),
            "secret": override.get("secret") if override else decrypt_secret(settings.secret_encrypted),
        }
        provider_object = BostaProvider(payload)
        return provider_object.test_connection()
