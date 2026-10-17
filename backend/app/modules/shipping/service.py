from __future__ import annotations

import base64
import hashlib

from flask import current_app
from cryptography.fernet import Fernet


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
