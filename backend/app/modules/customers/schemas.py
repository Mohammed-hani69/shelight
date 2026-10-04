"""Schemas العملاء — عام واستقبال تحديثات الملف وكلمة المرور."""
from __future__ import annotations

from marshmallow import Schema, fields

from app.core.validation import FIELD_ERRORS, password_field


class CustomerPublicSchema(Schema):
    """تمثيل العميل للمستهلك — لا يكشف أي بيانات حسّاسة."""

    id = fields.Method("_id")
    email = fields.Email(allow_none=True)
    firstName = fields.Str(attribute="first_name")
    lastName = fields.Str(attribute="last_name")
    phone = fields.Str(allow_none=True)
    address = fields.Str(allow_none=True)
    city = fields.Str(allow_none=True)
    governorate = fields.Str(allow_none=True)
    birthday = fields.Date(allow_none=True)
    newsletter = fields.Bool()
    loyaltyPoints = fields.Int(attribute="loyalty_points")
    isAdmin = fields.Bool(attribute="is_admin")
    createdAt = fields.Method("_created_at")

    @staticmethod
    def _id(obj):
        return str(obj.id)

    @staticmethod
    def _created_at(obj):
        return obj.created_at.isoformat() if obj.created_at else None


class ProfileUpdateSchema(Schema):
    """حقول اختيارية؛ تُحدَّث فقط ما يُرسل."""

    firstName = fields.Str(data_key="firstName")
    lastName = fields.Str(data_key="lastName")
    phone = fields.Str(data_key="phone", allow_none=True)
    address = fields.Str(data_key="address", allow_none=True)
    city = fields.Str(data_key="city", allow_none=True)
    governorate = fields.Str(data_key="governorate", allow_none=True)
    birthday = fields.Date(data_key="birthday", allow_none=True)
    newsletter = fields.Bool(data_key="newsletter")


class ChangePasswordSchema(Schema):
    currentPassword = fields.Str(required=True, data_key="currentPassword", error_messages=FIELD_ERRORS)
    newPassword = password_field(data_key="newPassword", required=True)