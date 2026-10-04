"""طبقة الموارد المشتركة — مساعدات التجسير (schema loading) للمعالجة المدخلة."""
from __future__ import annotations

from flask import request
from marshmallow import Schema

from app.core.errors import ApiError


def load_json_or_400(schema: Schema, *, partial: bool = False) -> dict:
    """يفحص جسم الطلب JSON مقابل schema ويعيد بيانات موثّقة.

    - جسم غير JSON           → 400 invalid_json
    - حقل غير مطابق للقيود    → 422 validation_error (عبر معالج الأخطاء)
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(
            "الطلب يجب أن يحتوي جسم JSON صالح",
            status_code=400,
            code="invalid_json",
        )
    return schema.load(data, partial=partial)