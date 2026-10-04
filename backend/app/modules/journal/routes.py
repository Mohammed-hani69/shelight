"""روتات المدونة: قائمة المقالات وتفاصيل مقال واحد."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.core.i18n import lang_from_args
from app.modules.journal import services
from app.modules.journal.schemas import JournalPostOut

bp = Blueprint("journal", __name__)


@bp.get("/journal")
def list_articles():
    """المقالات المنشورة — تُستهلك في صفحة المدونة وقسم مقالات الرئيسية."""
    lang = lang_from_args(request.args)
    articles = services.list_articles()
    return jsonify({"data": JournalPostOut(many=True, lang=lang).dump(articles)})


@bp.get("/journal/<slug>")
def get_article(slug: str):
    """مقال واحد بالـ slug."""
    lang = lang_from_args(request.args)
    return jsonify({"data": JournalPostOut(lang=lang).dump(services.get_article_or_404(slug))})