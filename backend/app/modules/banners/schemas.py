"""Schemas البنرات — إدخال موثّق للمدير وتمثيل موحّد للعرض."""
from __future__ import annotations

from marshmallow import Schema, fields, validate

SECTIONS = ["HERO", "EDITORIAL"]


class BannerWriteSchema(Schema):
    """إنشاء/تحديث بنر — مفاتيح camelCase كما في بقية اللوحة."""

    section = fields.Str(required=True, validate=validate.OneOf(SECTIONS))
    image_url = fields.Str(required=True, data_key="imageUrl", validate=validate.Length(min=1, max=500))
    link_url = fields.Str(data_key="linkUrl", allow_none=True, validate=validate.Length(max=500))
    sort_order = fields.Int(data_key="sortOrder", load_default=0)
    is_active = fields.Bool(data_key="isActive", load_default=True)


class BannerPatchSchema(Schema):
    """تحديث جزئي سريع — إظهار/إخفاء/ترتيب/تعديل رابط."""

    image_url = fields.Str(data_key="imageUrl", validate=validate.Length(min=1, max=500))
    link_url = fields.Str(data_key="linkUrl", allow_none=True, validate=validate.Length(max=500))
    sort_order = fields.Int(data_key="sortOrder")
    is_active = fields.Bool(data_key="isActive")


class BannerMoveSchema(Schema):
    direction = fields.Str(required=True, validate=validate.OneOf(["up", "down"]))


def banner_payload(banner) -> dict:
    """تمثيل البنر — يُخزَّن مسار الصورة نسبياً وتطلقه الواجهة لنطاق الـ API."""
    return {
        "id": str(banner.id),
        "section": banner.section,
        "imageUrl": banner.image_url,
        "linkUrl": banner.link_url,
        "sortOrder": banner.sort_order,
        "isActive": banner.is_active,
    }
