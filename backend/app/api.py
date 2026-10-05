"""تجميع كل روتات الوحدات تحت المساحة /api/v1.

إضافة وحدة جديدة = استيراد بلوبريانت هنا وتسجيله، ثم يعمل تلقائياً.
"""
from __future__ import annotations

from flask import Blueprint

from app.modules.admin.routes import bp as admin_bp
from app.modules.analytics.routes import bp as analytics_bp
from app.modules.auth.routes import bp as auth_bp
from app.modules.banners.routes import admin_bp as banners_admin_bp
from app.modules.banners.routes import bp as banners_bp
from app.modules.bundles.routes import bp as bundles_bp
from app.modules.cart.routes import bp as cart_bp
from app.modules.coupons.routes import bp as coupons_bp
from app.modules.customers.routes import bp as customers_bp
from app.modules.journal.routes import bp as journal_bp
from app.modules.marketing_sections.routes import admin_bp as sections_admin_bp
from app.modules.marketing_sections.routes import public_bp as sections_public_bp
from app.modules.orders.routes import bp as orders_bp
from app.modules.products.routes import bp as products_bp
from app.modules.reviews.routes import bp as reviews_bp
from app.modules.reviews.routes import admin_bp as reviews_admin_bp
from app.modules.shipping.routes import bp as shipping_bp
from app.modules.tracking.routes import bp as tracking_bp
from app.modules.wishlist.routes import bp as wishlist_bp

api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")

api_v1.register_blueprint(admin_bp)
api_v1.register_blueprint(auth_bp)
api_v1.register_blueprint(banners_bp)
api_v1.register_blueprint(banners_admin_bp)
api_v1.register_blueprint(products_bp)
api_v1.register_blueprint(reviews_bp)
api_v1.register_blueprint(reviews_admin_bp)
api_v1.register_blueprint(cart_bp)
api_v1.register_blueprint(wishlist_bp)
api_v1.register_blueprint(orders_bp)
api_v1.register_blueprint(coupons_bp)
api_v1.register_blueprint(customers_bp)
api_v1.register_blueprint(bundles_bp)
api_v1.register_blueprint(journal_bp)
api_v1.register_blueprint(sections_public_bp)
api_v1.register_blueprint(sections_admin_bp)
api_v1.register_blueprint(tracking_bp)
api_v1.register_blueprint(shipping_bp)
api_v1.register_blueprint(analytics_bp)