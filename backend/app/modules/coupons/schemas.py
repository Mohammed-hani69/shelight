"""Schemas الكوبونات."""
from __future__ import annotations

from marshmallow import Schema, fields, validate


class CouponValidateSchema(Schema):
    code = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    subtotal = fields.Float(required=True, validate=validate.Range(min=0))