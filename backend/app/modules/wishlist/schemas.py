"""Schemas الأمنيات — بسيطة لأن السرد يعيد منتجات."""
from __future__ import annotations

from marshmallow import Schema, fields


class WishlistAddSchema(Schema):
    productId = fields.Int(required=True, data_key="productId")