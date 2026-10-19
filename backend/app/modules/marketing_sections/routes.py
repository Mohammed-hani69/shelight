from __future__ import annotations

import os
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from marshmallow import Schema, ValidationError, fields, validate
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from werkzeug.utils import secure_filename

from app.core.errors import ApiError
from app.core.security import admin_required
from app.extensions import db
from app.models import Product, StorefrontSection
from app.modules.products.schemas import ProductListOut
from app.modules.products.upload import save_uploaded_image
from app.modules.marketing_sections.store_settings import (
    GOVERNORATE_KEYS,
    get_store_settings,
    normalize_social_links,
    save_store_settings,
)

public_bp = Blueprint("storefront_sections", __name__, url_prefix="/storefront/sections")
admin_bp = Blueprint("storefront_sections_admin", __name__, url_prefix="/admin/storefront/sections")
settings_public_bp = Blueprint("store_settings", __name__, url_prefix="/storefront/settings")
settings_admin_bp = Blueprint("store_settings_admin", __name__, url_prefix="/admin/store-settings")
pages_public_bp = Blueprint("site_pages", __name__, url_prefix="/storefront/pages")
pages_admin_bp = Blueprint("site_pages_admin", __name__, url_prefix="/admin/storefront/pages")
videos_public_bp = Blueprint("storefront_videos", __name__, url_prefix="/storefront/videos")
videos_admin_bp = Blueprint("storefront_videos_admin", __name__, url_prefix="/admin/storefront/videos")
trust_public_bp = Blueprint("customer_trust", __name__, url_prefix="/storefront/customer-trust")
trust_admin_bp = Blueprint("customer_trust_admin", __name__, url_prefix="/admin/storefront/customer-trust")

SITE_PAGE_KEYS = {"about", "contact", "shipping-returns", "faq"}
VIDEO_SECTION_KEY = "homepage_videos"
TRUST_SECTION_KEY = "customer_trust"


class SocialLinksSchema(Schema):
    facebook = fields.Str(load_default="", validate=validate.Length(max=300))
    instagram = fields.Str(load_default="", validate=validate.Length(max=300))
    tiktok = fields.Str(load_default="", validate=validate.Length(max=300))


class StoreSettingsSchema(Schema):
    defaultShippingFee = fields.Float(required=True, validate=validate.Range(min=0, max=100000))
    governorateFees = fields.Dict(
        keys=fields.Str(validate=validate.OneOf(GOVERNORATE_KEYS)),
        values=fields.Float(validate=validate.Range(min=0, max=100000)),
        required=True,
    )
    freeShippingThreshold = fields.Float(required=True, validate=validate.Range(min=0, max=10000000))
    announcementAr = fields.Str(required=True, validate=validate.Length(max=240))
    announcementEn = fields.Str(required=True, validate=validate.Length(max=240))
    whatsappPhone = fields.Str(load_default="", validate=validate.Length(max=32))
    socialLinks = fields.Nested(SocialLinksSchema, load_default=dict)


class SitePageItemSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    body = fields.Str(required=True, validate=validate.Length(max=5000))
    detail = fields.Str(load_default="", validate=validate.Length(max=1000))
    kind = fields.Str(load_default="", validate=validate.OneOf(("", "phone", "email", "location", "clock")))


class SitePageWriteSchema(Schema):
    eyebrow = fields.Str(required=True, validate=validate.Length(max=160))
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    description = fields.Str(required=True, validate=validate.Length(max=2000))
    imageUrl = fields.Str(load_default="", validate=validate.Length(max=500))
    imageAlt = fields.Str(load_default="", validate=validate.Length(max=300))
    items = fields.List(
        fields.Nested(SitePageItemSchema),
        load_default=list,
        validate=validate.Length(max=50),
    )


class VideoItemSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=160))
    url = fields.Str(required=True, validate=validate.Length(min=1, max=500))


class VideoSectionWriteSchema(Schema):
    isActive = fields.Bool(load_default=False)
    title = fields.Str(load_default="", validate=validate.Length(max=160))
    description = fields.Str(load_default="", validate=validate.Length(max=500))
    videos = fields.List(
        fields.Nested(VideoItemSchema),
        load_default=list,
        validate=validate.Length(max=30),
    )


class CustomerTrustImageSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=160))
    url = fields.Str(required=True, validate=validate.Length(min=1, max=500))


class CustomerTrustWriteSchema(Schema):
    isActive = fields.Bool(load_default=False)
    title = fields.Str(load_default="", validate=validate.Length(max=160))
    description = fields.Str(load_default="", validate=validate.Length(max=500))
    images = fields.List(
        fields.Nested(CustomerTrustImageSchema),
        load_default=list,
        validate=validate.Length(max=30),
    )


def _video_section() -> StorefrontSection | None:
    return StorefrontSection.query.filter_by(section_key=VIDEO_SECTION_KEY).first()


def _video_section_payload(section: StorefrontSection | None) -> dict:
    content = section.content if section and isinstance(section.content, dict) else {}
    raw_videos = content.get("videos", [])
    return {
        "isActive": bool(section and section.is_active),
        "title": content.get("title", ""),
        "description": content.get("description", ""),
        "videos": raw_videos if isinstance(raw_videos, list) else [],
    }


def _require_uploaded_videos(videos: list[dict]) -> None:
    if any(not video["url"].startswith("/uploads/videos/") for video in videos):
        raise ApiError(
            "يجب رفع الفيديوهات إلى الموقع قبل إضافتها.",
            status_code=400,
            code="video_must_be_uploaded",
        )


def _customer_trust_section() -> StorefrontSection | None:
    return StorefrontSection.query.filter_by(section_key=TRUST_SECTION_KEY).first()


def _customer_trust_payload(section: StorefrontSection | None) -> dict:
    content = section.content if section and isinstance(section.content, dict) else {}
    raw_images = content.get("images", [])
    return {
        "isActive": bool(section and section.is_active),
        "title": content.get("title", "ثقة عملائنا فينا"),
        "description": content.get("description", ""),
        "images": raw_images if isinstance(raw_images, list) else [],
    }


def _require_uploaded_customer_trust_images(images: list[dict]) -> None:
    if any(not image["url"].startswith("/uploads/customer-trust/") for image in images):
        raise ApiError(
            "يجب رفع الصور إلى الموقع قبل إضافتها.",
            status_code=400,
            code="customer_trust_image_must_be_uploaded",
        )


@trust_public_bp.get("")
def get_public_customer_trust():
    payload = _customer_trust_payload(_customer_trust_section())
    if not payload["isActive"]:
        return jsonify({"data": None})
    payload["images"] = [
        image for image in payload["images"]
        if isinstance(image, dict)
        and isinstance(image.get("url"), str)
        and image["url"].startswith("/uploads/customer-trust/")
    ]
    return jsonify({"data": payload if payload["images"] else None})


@trust_admin_bp.get("")
@admin_required()
def get_admin_customer_trust():
    return jsonify({"data": _customer_trust_payload(_customer_trust_section())})


@trust_admin_bp.put("")
@admin_required()
def save_admin_customer_trust():
    try:
        content = CustomerTrustWriteSchema().load(request.get_json(silent=True) or {})
    except ValidationError as error:
        raise ApiError(
            "بيانات قسم ثقة العملاء غير صالحة",
            status_code=400,
            code="invalid_customer_trust_section",
        ) from error
    _require_uploaded_customer_trust_images(content["images"])

    section = _customer_trust_section()
    if section is None:
        section = StorefrontSection(section_key=TRUST_SECTION_KEY, section_type="customer_trust")
    section.section_type = "customer_trust"
    section.is_active = content["isActive"]
    section.content = {
        "title": content["title"],
        "description": content["description"],
        "images": content["images"],
    }
    db.session.add(section)
    db.session.commit()
    return jsonify({"data": _customer_trust_payload(section)})


@trust_admin_bp.post("/image")
@admin_required()
def upload_customer_trust_image():
    path = save_uploaded_image(subdir="customer-trust", max_bytes_key="BANNER_MAX_BYTES")
    return jsonify({"data": {"path": path}}), 201


@videos_public_bp.get("")
def get_public_videos():
    section = _video_section()
    payload = _video_section_payload(section)
    if not payload["isActive"]:
        return jsonify({"data": None})
    payload["videos"] = [
        video for video in payload["videos"]
        if isinstance(video, dict)
        and isinstance(video.get("url"), str)
        and video["url"].startswith("/uploads/videos/")
    ]
    return jsonify({"data": payload if payload["videos"] else None})


@videos_admin_bp.get("")
@admin_required()
def get_admin_videos():
    return jsonify({"data": _video_section_payload(_video_section())})


@videos_admin_bp.put("")
@admin_required()
def save_admin_videos():
    try:
        content = VideoSectionWriteSchema().load(request.get_json(silent=True) or {})
    except ValidationError as error:
        raise ApiError("بيانات قسم الفيديوهات غير صالحة", status_code=400, code="invalid_video_section") from error
    _require_uploaded_videos(content["videos"])

    section = _video_section()
    if section is None:
        section = StorefrontSection(section_key=VIDEO_SECTION_KEY, section_type="video_carousel")
    section.section_type = "video_carousel"
    section.is_active = content["isActive"]
    section.content = {
        "title": content["title"],
        "description": content["description"],
        "videos": content["videos"],
    }
    db.session.add(section)
    db.session.commit()
    return jsonify({"data": _video_section_payload(section)})


@videos_admin_bp.post("/upload")
@admin_required()
def upload_storefront_video():
    request.environ["shelight.max_content_length"] = current_app.config["VIDEO_MAX_BYTES"]
    uploaded = request.files.get("file")
    if uploaded is None or not uploaded.filename:
        raise ApiError("لم يتم اختيار فيديو", status_code=422, code="no_file")

    head = uploaded.stream.read(32)
    uploaded.stream.seek(0)
    extension = None
    if len(head) >= 8 and head[4:8] == b"ftyp":
        extension = "mp4"
    elif head.startswith(b"\x1aE\xdf\xa3"):
        extension = "webm"
    if extension is None:
        raise ApiError(
            "صيغة الفيديو غير مدعومة. ارفع فيديو MP4 أو WebM.",
            status_code=422,
            code="bad_video_type",
        )

    folder = os.path.join(current_app.config["UPLOAD_FOLDER"], "videos")
    os.makedirs(folder, exist_ok=True)
    filename = f"{uuid4().hex}.{extension}"
    uploaded.save(os.path.join(folder, secure_filename(filename)))
    return jsonify({"data": {"path": f"/uploads/videos/{filename}"}}), 201


def _require_uploaded_site_page_image(image_url: str) -> None:
    if image_url and not image_url.startswith("/uploads/site-pages/"):
        raise ApiError(
            "يجب اختيار الصورة من خلال رفعها إلى الموقع.",
            status_code=400,
            code="site_page_image_must_be_uploaded",
        )


def _site_page_section(page_key: str) -> StorefrontSection | None:
    if page_key not in SITE_PAGE_KEYS:
        raise ApiError("الصفحة المطلوبة غير موجودة", status_code=404, code="not_found")
    return StorefrontSection.query.filter_by(section_key=f"page_{page_key}").first()


def _site_page_payload(page_key: str, section: StorefrontSection | None) -> dict | None:
    if section is None:
        return None
    content = dict(section.content or {})
    image_url = content.get("imageUrl", "")
    if image_url and not image_url.startswith("/uploads/site-pages/"):
        content["imageUrl"] = ""
    return {"key": page_key, **content}


@pages_public_bp.get("/<page_key>")
def get_public_site_page(page_key: str):
    section = _site_page_section(page_key)
    return jsonify({"data": _site_page_payload(page_key, section)})


@pages_admin_bp.get("/<page_key>")
@admin_required()
def get_admin_site_page(page_key: str):
    section = _site_page_section(page_key)
    return jsonify({"data": _site_page_payload(page_key, section)})


@pages_admin_bp.put("/<page_key>")
@admin_required()
def save_admin_site_page(page_key: str):
    section = _site_page_section(page_key)
    try:
        content = SitePageWriteSchema().load(request.get_json(silent=True) or {})
    except ValidationError as error:
        raise ApiError("محتوى الصفحة غير صالح", status_code=400, code="invalid_site_page") from error
    _require_uploaded_site_page_image(content["imageUrl"])

    if section is None:
        section = StorefrontSection(section_key=f"page_{page_key}", section_type="site_page")
    section.content = content
    section.is_active = True
    db.session.add(section)
    db.session.commit()
    return jsonify({"data": _site_page_payload(page_key, section)})


@pages_admin_bp.post("/<page_key>/image")
@admin_required()
def upload_site_page_image(page_key: str):
    if page_key not in SITE_PAGE_KEYS:
        raise ApiError("الصفحة المطلوبة غير موجودة", status_code=404, code="not_found")
    path = save_uploaded_image(
        subdir="site-pages",
        max_bytes_key="BANNER_MAX_BYTES",
    )
    return jsonify({"data": {"path": path}}), 201


@settings_public_bp.get("")
def get_public_store_settings():
    return jsonify({"data": get_store_settings()})


@settings_admin_bp.get("")
@admin_required()
def get_admin_store_settings():
    return jsonify({"data": get_store_settings()})


@settings_admin_bp.put("")
@admin_required()
def update_admin_store_settings():
    try:
        data = StoreSettingsSchema().load(request.get_json(silent=True) or {})
    except ValidationError as error:
        raise ApiError("إعدادات المتجر غير صالحة", status_code=400, code="invalid_store_settings") from error
    data["governorateFees"] = {
        key: data["governorateFees"].get(key, data["defaultShippingFee"])
        for key in GOVERNORATE_KEYS
    }
    data["whatsappPhone"] = "".join(char for char in data["whatsappPhone"] if char.isdigit())
    data["socialLinks"] = normalize_social_links(data.get("socialLinks"))
    return jsonify({"data": save_store_settings(data)})


class SectionWriteSchema(Schema):
    sectionType = fields.Str(required=True, validate=validate.Length(min=1, max=40))
    isActive = fields.Bool(load_default=False)
    title = fields.Str(load_default="", validate=validate.Length(max=160))
    description = fields.Str(load_default="", validate=validate.Length(max=500))
    imageUrl = fields.Str(load_default="", validate=validate.Length(max=500))
    buttonText = fields.Str(load_default="", validate=validate.Length(max=80))
    rewardPercent = fields.Float(load_default=10, validate=validate.Range(min=1, max=100))
    productIds = fields.List(fields.Int(strict=True), load_default=list, validate=validate.Length(max=30))


def _section_or_default(section_key: str) -> StorefrontSection | None:
    return StorefrontSection.query.filter_by(section_key=section_key).first()


def _products_for_section(content: dict) -> list[Product]:
    raw_ids = content.get("productIds", [])
    ids = [value for value in raw_ids if isinstance(value, int) and not isinstance(value, bool)]
    if not ids:
        return []
    products = db.session.execute(
        select(Product)
        .where(
            Product.id.in_(ids),
            Product.is_active.is_(True),
            Product.compare_at_price.is_not(None),
            Product.compare_at_price > Product.price,
        )
        .options(selectinload(Product.images), selectinload(Product.category))
    ).scalars().all()
    products_by_id = {product.id: product for product in products}
    return [products_by_id[product_id] for product_id in ids if product_id in products_by_id]


def _section_payload(section: StorefrontSection) -> dict:
    content = section.content or {}
    return {
        "key": section.section_key,
        "type": section.section_type,
        "isActive": section.is_active,
        "title": content.get("title", ""),
        "description": content.get("description", ""),
        "imageUrl": content.get("imageUrl", ""),
        "buttonText": content.get("buttonText", ""),
        "rewardPercent": content.get("rewardPercent", 10),
        "productIds": content.get("productIds", []),
    }


@public_bp.get("/<section_key>")
def get_public_section(section_key: str):
    section = _section_or_default(section_key)
    if section is None or not section.is_active:
        return jsonify({"data": None})
    content = section.content or {}
    products = _products_for_section(content)
    payload = _section_payload(section)
    payload["products"] = ProductListOut(many=True, lang="ar").dump(products)
    return jsonify({"data": payload})


@admin_bp.get("/<section_key>")
@admin_required()
def get_admin_section(section_key: str):
    section = _section_or_default(section_key)
    if section is not None:
        return jsonify({"data": _section_payload(section)})
    return jsonify(
        {
            "data": {
                "key": section_key,
                "type": "product_offer_popup" if section_key == "offers_popup" else "custom",
                "isActive": False,
                "title": "",
                "description": "",
                "imageUrl": "",
                "buttonText": "",
                "rewardPercent": 10,
                "productIds": [],
            }
        }
    )


@admin_bp.put("/<section_key>")
@admin_required()
def save_admin_section(section_key: str):
    try:
        data = SectionWriteSchema().load(request.get_json(silent=True) or {})
    except ValidationError as error:
        raise ApiError("بيانات القسم غير صالحة", status_code=400, code="invalid_section") from error

    product_ids = data["productIds"]
    if product_ids:
        valid_ids = db.session.execute(
            select(Product.id).where(
                Product.id.in_(product_ids),
                Product.is_active.is_(True),
                Product.compare_at_price.is_not(None),
                Product.compare_at_price > Product.price,
            )
        ).scalars().all()
        if len(set(valid_ids)) != len(set(product_ids)):
            raise ApiError(
                "اختر منتجات نشطة عليها خصم فعلي فقط.",
                status_code=400,
                code="invalid_offer_products",
            )

    section = _section_or_default(section_key)
    if section is None:
        section = StorefrontSection(section_key=section_key, section_type=data["sectionType"])
    section.section_type = data["sectionType"]
    section.is_active = data["isActive"]
    section.content = {
        "title": data["title"],
        "description": data["description"],
        "imageUrl": data["imageUrl"],
        "buttonText": data["buttonText"],
        "rewardPercent": data["rewardPercent"],
        "productIds": list(dict.fromkeys(product_ids)),
    }
    db.session.add(section)
    db.session.commit()
    return jsonify({"data": _section_payload(section)})
