"""روتات البنرات — استهلاك عام في المتجر + إدارة كاملة من اللوحة."""
from __future__ import annotations

import os
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request

from app.core.errors import ApiError
from app.core.schema import load_json_or_400
from app.core.security import admin_required
from app.modules.banners import services
from app.modules.banners.schemas import (
    BannerMoveSchema,
    BannerPatchSchema,
    BannerWriteSchema,
    banner_payload,
)

# ---------------------------------------------------------------------------
# مسار عام — تستهلكه الرئيسية لعرض البنرات
# ---------------------------------------------------------------------------

bp = Blueprint("banners", __name__)


@bp.get("/banners")
def list_banners():
    """البنرات النشطة، مع تصفية اختيارية `?section=HERO|EDITORIAL`."""
    section = request.args.get("section")
    if section and section not in services.SECTIONS:
        raise ApiError("قسم غير معروف", status_code=422, code="bad_section")
    banners = services.list_active(section)
    return jsonify({"data": [banner_payload(b) for b in banners]})


# ---------------------------------------------------------------------------
# مسارات الإدارة
# ---------------------------------------------------------------------------

admin_bp = Blueprint("banners_admin", __name__, url_prefix="/admin/banners")


@admin_bp.get("")
@admin_required()
def list_admin_banners():
    """كل البنرات (نشطة ومخفية) — لإدارة اللوحة."""
    banners = services.list_admin_banners()
    return jsonify({"data": [banner_payload(b) for b in banners]})


@admin_bp.post("")
@admin_required()
def create_banner():
    banner = services.create_banner(load_json_or_400(BannerWriteSchema()))
    return jsonify({"data": banner_payload(banner)}), 201


@admin_bp.patch("/<int:banner_id>")
@admin_required()
def patch_banner(banner_id: int):
    """تحديث جزئي — للأزرار السريعة (إظهار/إخفاء/ترتيب)."""
    banner = services.get_banner_or_404(banner_id)
    updated = services.update_banner(
        banner, load_json_or_400(BannerPatchSchema())
    )
    return jsonify({"data": banner_payload(updated)})


@admin_bp.put("/<int:banner_id>")
@admin_required()
def update_banner(banner_id: int):
    banner = services.get_banner_or_404(banner_id)
    updated = services.update_banner(banner, load_json_or_400(BannerWriteSchema()))
    return jsonify({"data": banner_payload(updated)})


@admin_bp.delete("/<int:banner_id>")
@admin_required()
def delete_banner(banner_id: int):
    """إخفاء منطقي — يختفي البنر من الموقع دون حذف السجل."""
    banner = services.get_banner_or_404(banner_id)
    services.delete_banner(banner)
    return jsonify({"data": {"id": banner_id, "isActive": False}})


@admin_bp.post("/<int:banner_id>/move")
@admin_required()
def move_banner(banner_id: int):
    """إعادة ترتيب البنر لأعلى/أسفل داخل قسمه."""
    banner = services.get_banner_or_404(banner_id)
    direction = load_json_or_400(BannerMoveSchema())["direction"]
    services.move_banner(banner, direction)
    return jsonify({"data": {"moved": True}})


@admin_bp.post("/upload")
@admin_required()
def upload_banner_image():
    """استقبال صورة بنر — يرفع سقف حجم الطلب مؤقتاً لهذا المسار فقط.

    `request.max_content_length` في Flask 3.0 قراءة فقط (من الإعدادات)،
    لذا نرفع `MAX_CONTENT_LENGTH` لحظة قراءة الملف ثم نعيده في `finally`
    حتى يبقى السقف العام 64KB لبقية النقاط.
    """
    previous_limit = current_app.config["MAX_CONTENT_LENGTH"]
    current_app.config["MAX_CONTENT_LENGTH"] = current_app.config["BANNER_MAX_BYTES"]
    try:
        file = request.files.get("file")
    finally:
        current_app.config["MAX_CONTENT_LENGTH"] = previous_limit

    if file is None or not file.filename:
        raise ApiError("لم يتم اختيار ملف", status_code=422, code="no_file")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]:
        raise ApiError(
            "صيغة الصورة غير مدعومة (المسموح: png, jpg, jpeg, webp, gif, avif)",
            status_code=422,
            code="bad_image_type",
        )

    folder = os.path.join(current_app.config["UPLOAD_FOLDER"], "banners")
    os.makedirs(folder, exist_ok=True)
    filename = f"{uuid4().hex}.{ext}"
    file.save(os.path.join(folder, filename))
    return jsonify({"data": {"path": f"/uploads/banners/{filename}"}}), 201
