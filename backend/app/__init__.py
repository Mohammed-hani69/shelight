"""مصنع التطبيق — ينشئ نسخة Flask مُهيأة حسب البيئة.

الاستخدام في التطوير:
    flask --app run.py run
"""
from __future__ import annotations

import os

import click
from flask import current_app, Flask, send_from_directory
from flask_cors import CORS

from app.config import config_map, validate_production_secrets
from app.core.errors import register_error_handlers
from app.extensions import db, jwt, migrate


def create_app(config_name: str | None = None) -> Flask:
    """ينشئ التطبيق ويسجّل الامتدادات والبلوبريانت ومعالجات الأخطاء."""
    app = Flask(__name__)
    config_name = config_name or os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_map[config_name])
    if config_name == "production":
        validate_production_secrets()

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from app.api import api_v1
    from app.modules.shipping.webhook import bp as shipping_webhook_bp

    app.register_blueprint(api_v1)
    app.register_blueprint(shipping_webhook_bp)

    register_error_handlers(app)
    register_cli(app)

    # مجلد الرفع يُنشأ عند الإقلاع، وتُخدم ملفاته مباشرة (صور البنرات
    # وصور المنتجات المرفوعة من اللوحة).
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename: str):
        # نقرأ المسار من الإعدادات عند كل طلب لا من متغيّر مقفول عند الإنشاء:
        # الإغلاق كان يجعل تغيير UPLOAD_FOLDER بعد الإقلاع يجعل الكتابة تذهب
        # لمجلد جديد بينما القراءة تبقى على القديم = صور مفقودة بعد أي تعديل.
        return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


def register_cli(app: Flask) -> None:
    """أوامر سطر الأوامر المساعدة."""

    @app.cli.command("init-db")
    def init_db_command() -> None:
        """ينشئ الجداول مباشرة (بديل سريع عن Alembic في التطوير)."""
        db.create_all()
        click.echo("تم إنشاء جداول قاعدة البيانات.")

    @app.cli.command("seed")
    def seed_command() -> None:
        """يزرع بيانات تجريبية مطابقة لعينات الواجهة."""
        from app.seeds import seed_all, seed_banners

        seed_all()
        seed_banners()
        db.session.commit()
        click.echo("تمت زراعة البيانات التجريبية.")

    @app.cli.command("seed-banners")
    def seed_banners_command() -> None:
        """يزرع بنرات الرئيسية الافتراضية فقط (idempotent) دون لمس بقية البيانات."""
        from app.seeds import seed_banners

        created = seed_banners()
        db.session.commit()
        click.echo(f"تمت إضافة {created} بنر.")