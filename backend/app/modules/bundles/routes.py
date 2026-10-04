"""روتات الباقات: قائمة الباقات وتفاصيل باقة واحدة."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.core.i18n import lang_from_args
from app.modules.bundles import services
from app.modules.bundles.schemas import BundleOut

bp = Blueprint("bundles", __name__)


@bp.get("/bundles")
def list_bundles():
    """الباقات النشطة مع أعضائها — تُستهلكها صفحة الباقات وقسم الطقوس."""
    lang = lang_from_args(request.args)
    bundles = services.list_bundles()
    return jsonify({"data": BundleOut(many=True, lang=lang).dump(bundles)})


@bp.get("/bundles/<slug>")
def get_bundle(slug: str):
    """باقة واحدة بالـ slug."""
    lang = lang_from_args(request.args)
    return jsonify({"data": BundleOut(lang=lang).dump(services.get_bundle_or_404(slug))})
