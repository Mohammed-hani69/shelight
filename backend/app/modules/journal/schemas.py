"""Schemas تصدير مقالات المدونة — مفاتيح camelCase واختيار لغة المحتوى."""
from __future__ import annotations

from marshmallow import fields

from app.modules.products.schemas import LocalizedSchema


class JournalPostOut(LocalizedSchema):
    """مقال منشور كما يراه زائر «المدونة» — المحتوى بفقرات نصية."""

    id = fields.Method("_id")
    slug = fields.Str()
    title = fields.Method("_title")
    excerpt = fields.Method("_excerpt")
    content = fields.Method("_content")
    category = fields.Str()
    author = fields.Str()
    readTime = fields.Str(attribute="read_time")
    publishDate = fields.Method("_publish_date")
    image = fields.Str(attribute="image_url")
    isFeatured = fields.Bool(attribute="is_featured")

    def _title(self, obj):
        return self._localized(obj, "title")

    def _excerpt(self, obj):
        return self._localized(obj, "excerpt")

    def _content(self, obj):
        return self._localized(obj, "content")

    @staticmethod
    def _id(obj):
        return str(obj.id)

    @staticmethod
    def _publish_date(obj):
        return obj.publish_date.isoformat()