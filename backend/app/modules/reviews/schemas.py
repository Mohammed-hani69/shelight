"""Schemas المراجعات."""
from __future__ import annotations

from marshmallow import Schema, fields, validate


class ReviewCreateSchema(Schema):
    rating = fields.Int(required=True, validate=validate.Range(min=1, max=5))
    title = fields.Str(validate=validate.Length(max=200))
    body = fields.Str(required=True, validate=validate.Length(min=2, max=2000))
    author_name = fields.Str(data_key="authorName", validate=validate.Length(max=120))


class ReviewOut(Schema):
    id = fields.Method("_id")
    authorName = fields.Str(attribute="author_name")
    rating = fields.Int()
    title = fields.Str()
    body = fields.Str()
    isVerified = fields.Bool(attribute="is_verified")
    helpfulCount = fields.Int(attribute="helpful_count")
    createdAt = fields.Method("_created_at")

    @staticmethod
    def _id(obj):
        return str(obj.id)

    @staticmethod
    def _created_at(obj):
        return obj.created_at.isoformat() if obj.created_at else None