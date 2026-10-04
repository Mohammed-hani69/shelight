"""Schemas المصادقة — تتحقق من بيانات التسجيل والدخول."""
from __future__ import annotations

from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.core.validation import (
    FIELD_ERRORS,
    name_field,
    password_field,
    phone_field,
)


class RegisterSchema(Schema):
    email = fields.Email(allow_none=True, error_messages=FIELD_ERRORS)
    password = password_field(required=True)
    first_name = name_field("firstName", required=True, error_messages=FIELD_ERRORS)
    last_name = name_field("lastName", load_default="", error_messages=FIELD_ERRORS)
    phone = phone_field(error_messages=FIELD_ERRORS)
    address = fields.Str(allow_none=True, validate=validate.Length(min=5, max=300))
    city = fields.Str(allow_none=True, validate=validate.Length(max=120))
    governorate = fields.Str(allow_none=True, validate=validate.Length(max=120))
    newsletter = fields.Bool(load_default=False)

    @validates_schema
    def validate_phone_registration(self, data: dict, **kwargs) -> None:
        if not data.get("email") and not data.get("phone"):
            raise ValidationError({"phone": "رقم الهاتف مطلوب"})
        if not data.get("email") and not data.get("address"):
            raise ValidationError({"address": "العنوان مطلوب"})


class LoginSchema(Schema):
    email = fields.Email(allow_none=True, error_messages=FIELD_ERRORS)
    phone = phone_field()
    password = fields.Str(required=True, load_only=True, error_messages=FIELD_ERRORS)

    @validates_schema
    def validate_identity(self, data: dict, **kwargs) -> None:
        if bool(data.get("email")) == bool(data.get("phone")):
            raise ValidationError({"phone": "أدخلي رقم الهاتف"})