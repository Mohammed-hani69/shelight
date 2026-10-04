"""إعداد بيئة الاختبارات — يبني نسخة تطبيق للبيئة testing ويعيد إنشاء قاعدة البيانات.

كل اختبار يحصل على قاعدة بيانات نظيفة مزرعة ببيانات تجريبية قابلة للتنبؤ.
"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from app.extensions import db as _db  # noqa: E402
from app.seeds import seed_all  # noqa: E402


@pytest.fixture()
def app():
    application = create_app("testing")
    with application.app_context():
        _db.create_all()
        seed_all()
    yield application
    with application.app_context():
        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers(client):
    """يسجّل مشترياً تجريبياً ويعيد رؤوس التفويض مع معرّف العميل."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "buyer@example.com",
            "password": "password123",
            "firstName": "Nada",
            "lastName": "Ali",
        },
    )
    assert response.status_code == 201
    token = response.get_json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def product_id(client, slug: str) -> int:
    """يعيد معرّف منتج من قاعدة البيانات عبر الـ API."""
    response = client.get(f"/api/v1/products/{slug}")
    assert response.status_code == 200
    return int(response.get_json()["data"]["id"])