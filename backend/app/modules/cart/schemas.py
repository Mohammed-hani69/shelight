"""Schemas السلة — الإدخال والإخراج.

ملاحظة: المنتجات تُعرف داخل البايلود بمعرّفاتها من الـ API (سلاسل أرقام)،
فيعالج fields.Int تنسيقها الرقمي من الأمام بسلاسة.
"""
from __future__ import annotations

from marshmallow import Schema, fields, validate


class CartItemAddSchema(Schema):
    productId = fields.Int(required=True, data_key="productId")
    quantity = fields.Int(data_key="quantity", load_default=1, validate=validate.Range(min=1, max=99))


class CartItemUpdateSchema(Schema):
    quantity = fields.Int(required=True, data_key="quantity", validate=validate.Range(min=1, max=99))