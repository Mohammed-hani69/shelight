"""طبقة الشحن العامة — تُوفّر واجهة موحّدة لمزوّدي الشحن.

تُستخدم هذه الطبقة كـ façade بين Flask API وموفّري الشحن الخارجيين مثل Bosta
وغيرهم، مع الاحتفاظ بكل تفاصيل الشركة في وحدة مستقلة قابلة للتوسّع.
"""
from __future__ import annotations

from app.modules.shipping.base import ShippingProvider
from app.modules.shipping.service import ShippingService

__all__ = ["ShippingProvider", "ShippingService"]
