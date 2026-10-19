from __future__ import annotations

from decimal import Decimal

from app.extensions import db
from app.models import Bundle


def _admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    access_token = response.get_json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {access_token}"}


def _create_bundle(*, is_active: bool = True) -> Bundle:
    bundle = Bundle(
        slug="summer-routine",
        name_en="Summer Routine",
        name_ar="روتين الصيف",
        price=Decimal("250.00"),
        compare_at_price=Decimal("300.00"),
        image_url="/uploads/bundles/summer.jpg",
        is_active=is_active,
    )
    db.session.add(bundle)
    db.session.commit()
    return bundle


def test_offer_popup_can_publish_selected_bundles(client, app):
    with app.app_context():
        bundle = _create_bundle()
        bundle_id = bundle.id

    headers = _admin_headers(client)
    saved = client.put(
        "/api/v1/admin/storefront/sections/offers_popup",
        headers=headers,
        json={
            "sectionType": "product_offer_popup",
            "isActive": True,
            "title": "عروض مختارة",
            "description": "عروض المنتجات والباقات",
            "bundleIds": [bundle_id],
        },
    )

    assert saved.status_code == 200
    assert saved.get_json()["data"]["bundleIds"] == [bundle_id]
    public = client.get("/api/v1/storefront/sections/offers_popup").get_json()["data"]
    assert public["bundles"] == [
        {
            "id": str(bundle_id),
            "slug": "summer-routine",
            "name": "روتين الصيف",
            "image": "/uploads/bundles/summer.jpg",
            "price": 250.0,
            "compareAtPrice": 300.0,
        }
    ]


def test_offer_popup_rejects_inactive_bundles(client, app):
    with app.app_context():
        bundle = _create_bundle(is_active=False)
        bundle_id = bundle.id

    response = client.put(
        "/api/v1/admin/storefront/sections/offers_popup",
        headers=_admin_headers(client),
        json={
            "sectionType": "product_offer_popup",
            "isActive": True,
            "bundleIds": [bundle_id],
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_offer_bundles"
