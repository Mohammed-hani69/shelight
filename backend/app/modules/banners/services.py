"""منطق البنرات — قراءة عامة للبنرات النشطة وCRUD كامل للمدير."""
from __future__ import annotations

from sqlalchemy import select

from app.core.errors import ApiError
from app.extensions import db
from app.models import Banner

SECTIONS = ("HERO", "EDITORIAL")


def list_active(section: str | None = None) -> list[Banner]:
    """البنرات النشطة مرتّبة — مع تصفية اختيارية بالقسم."""
    query = select(Banner).where(Banner.is_active.is_(True))
    if section:
        query = query.where(Banner.section == section)
    query = query.order_by(Banner.section, Banner.sort_order, Banner.id)
    return list(db.session.execute(query).scalars().all())


def list_admin_banners() -> list[Banner]:
    """كل البنرات (نشطة ومخفية) مرتّبة — لإدارة اللوحة."""
    query = select(Banner).order_by(Banner.section, Banner.sort_order, Banner.id)
    return list(db.session.execute(query).scalars().all())


def get_banner_or_404(banner_id: int) -> Banner:
    banner = db.session.get(Banner, banner_id)
    if banner is None:
        raise ApiError("البنر غير موجود", status_code=404, code="banner_not_found")
    return banner


def create_banner(data: dict) -> Banner:
    banner = Banner(
        section=data["section"],
        image_url=data["image_url"],
        mobile_image_url=data.get("mobile_image_url"),
        link_url=data.get("link_url"),
        sort_order=data.get("sort_order", 0),
        is_active=data.get("is_active", True),
    )
    db.session.add(banner)
    db.session.commit()
    return banner


def update_banner(banner: Banner, data: dict) -> Banner:
    for field, attr in [
        ("image_url", "image_url"),
        ("mobile_image_url", "mobile_image_url"),
        ("sort_order", "sort_order"),
        ("is_active", "is_active"),
    ]:
        if field in data:
            setattr(banner, attr, data[field])
    if data.get("link_url") is not None:
        banner.link_url = data["link_url"]
    elif "link_url" in data:
        banner.link_url = None
    db.session.commit()
    return banner


def delete_banner(banner: Banner) -> None:
    """إخفاء منطقي — يبقى السجل محفوظاً لكنه لا يظهر في الموقع."""
    banner.is_active = False
    db.session.commit()


def move_banner(banner: Banner, direction: str) -> list[Banner]:
    """نقل البنر لأعلى/أسفل بين بنرات نفس القسم."""
    siblings = (
        db.session.execute(
            select(Banner)
            .where(Banner.section == banner.section)
            .order_by(Banner.sort_order, Banner.id)
        )
        .scalars()
        .all()
    )
    index = next((i for i, item in enumerate(siblings) if item.id == banner.id), None)
    if index is None:
        raise ApiError("البنر غير موجود", status_code=404, code="banner_not_found")
    target = index - 1 if direction == "up" else index + 1
    if target < 0 or target >= len(siblings):
        return siblings
    banner.sort_order, siblings[target].sort_order = (
        siblings[target].sort_order,
        banner.sort_order,
    )
    db.session.commit()
    return siblings
