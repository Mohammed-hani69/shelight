"""اختبارات رفع صور المنتجات.

تغطّي: المسار الرSuccessful، حدود الصلاحية، رفض الملفات التي ليست صوراً،
أسماء الملفات الخبيثة، وخدمة الملف المرفوع عبر `/uploads`.
"""
from __future__ import annotations

import io

import pytest

#: بايتات سحرية حقيقية لكل صيغة — الرفع يعتمد عليها لا على الامتداد.
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + b"0" * 32
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00\x10JFIF" + b"0" * 32
GIF_BYTES = b"GIF89a" + b"0" * 32
# WebP: بصمته عند الإزاحة 8 (بعد حجم الـ RIFF)، وAVIF عند الإزاحة 4.
WEBP_BYTES = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"0" * 32
AVIF_BYTES = b"\x00\x00\x00\x20ftypavif" + b"0" * 32

UPLOAD_URL = "/api/v1/admin/products/upload"


@pytest.fixture()
def admin_headers(client):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['data']['accessToken']}"}


@pytest.fixture()
def upload_dir(app, tmp_path):
    """يوجّه الرفع لمجلد مؤقت حتى لا يمسّ مستودع التطوير."""
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    return tmp_path


def upload(client, headers, filename: str, content: bytes):
    return client.post(
        UPLOAD_URL,
        data={"file": (io.BytesIO(content), filename)},
        content_type="multipart/form-data",
        headers=headers,
    )


# ---------------------------------------------------------------------------
# المسار الناجح
# ---------------------------------------------------------------------------


def test_upload_product_image_succeeds(client, admin_headers, upload_dir):
    response = upload(client, admin_headers, "product.png", PNG_BYTES)
    assert response.status_code == 201
    path = response.get_json()["data"]["path"]
    assert path.startswith("/uploads/products/")
    assert path.endswith(".png")
    # الملف موجود فعلاً على القرص.
    assert (upload_dir / "products" / path.rsplit("/", 1)[-1]).is_file()


@pytest.mark.parametrize(
    "filename,content,expected_ext",
    [
        ("p.png", PNG_BYTES, ".png"),
        ("p.jpg", JPEG_BYTES, ".jpg"),
        ("p.jpeg", JPEG_BYTES, ".jpg"),
        ("p.gif", GIF_BYTES, ".gif"),
        ("p.webp", WEBP_BYTES, ".webp"),
        ("p.avif", AVIF_BYTES, ".avif"),
    ],
)
def test_every_supported_format_uploads(
    client, admin_headers, upload_dir, filename, content, expected_ext
):
    response = upload(client, admin_headers, filename, content)
    assert response.status_code == 201
    assert response.get_json()["data"]["path"].endswith(expected_ext)


def test_uploaded_file_is_served_over_http(client, admin_headers, upload_dir):
    """الرفع بلا خدمة = صورة لا تُعرض. المسار يجب أن يُقرأ فعلاً."""
    response = upload(client, admin_headers, "product.png", PNG_BYTES)
    path = response.get_json()["data"]["path"]
    served = client.get(path)
    assert served.status_code == 200
    assert served.data == PNG_BYTES


def test_uploaded_file_bytes_are_intact(client, admin_headers, upload_dir):
    """التحقق يقرأ أول 32 بايت فقط — الباقي يجب أن يُكتب كاملاً."""
    payload = PNG_BYTES + b"trailing-bytes-should-survive"
    path = upload(
        client, admin_headers, "product.png", payload
    ).get_json()["data"]["path"]
    assert client.get(path).data == payload


def test_uploaded_path_can_be_attached_to_product(client, admin_headers, upload_dir):
    """المسار المرفوع يُحفظ في المنتج ويظهر في لوحة الإدارة."""
    path = upload(client, admin_headers, "product.png", PNG_BYTES).get_json()["data"]["path"]

    created = client.post(
        "/api/v1/admin/products",
        json={
            "slug": "uploaded-product",
            "sku": "UPL-1",
            "name_en": "Uploaded Product",
            "price": "199.00",
            "images": [{"url": path, "alt_en": "Shot", "alt_ar": "لقطة"}],
        },
        headers=admin_headers,
    )
    assert created.status_code == 201
    product_id = created.get_json()["data"]["id"]

    detail = client.get(f"/api/v1/admin/products/{product_id}", headers=admin_headers)
    assert detail.status_code == 200
    images = detail.get_json()["data"]["images"]
    assert images[0]["url"] == path
    # النص البديل يُعاد بخياريه حتى لا يمحوه حفظ لاحق.
    assert images[0]["altEn"] == "Shot"
    assert images[0]["altAr"] == "لقطة"


# ---------------------------------------------------------------------------
# الصلاحيات
# ---------------------------------------------------------------------------


def test_upload_requires_admin(client, upload_dir):
    response = upload(client, {}, "product.png", PNG_BYTES)
    assert response.status_code == 401


def test_upload_rejects_non_admin(auth_headers, client, upload_dir):
    response = upload(client, auth_headers, "product.png", PNG_BYTES)
    assert response.status_code == 403


def test_missing_file_returns_422(client, admin_headers, upload_dir):
    response = client.post(
        UPLOAD_URL,
        data={},
        content_type="multipart/form-data",
        headers=admin_headers,
    )
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "no_file"


# ---------------------------------------------------------------------------
# رفض ما ليس صورة
# ---------------------------------------------------------------------------


def test_disguised_executable_is_rejected(client, admin_headers, upload_dir):
    """`evil.exe.png` كان يُقبل في الكود القديم لإELD الامتداد وحده."""
    response = upload(client, admin_headers, "evil.exe.png", b"MZ\x90\x00" + b"0" * 64)
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "bad_image_type"
    assert not (upload_dir / "products").exists() or not list(
        (upload_dir / "products").iterdir()
    )


def test_extension_lying_about_content_is_rejected(client, admin_headers, upload_dir):
    """اسم `.png` لا يحوّل ملف نصي إلى صورة."""
    response = upload(client, admin_headers, "notes.png", b"<?php echo 1; ?>")
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "bad_image_type"


def test_empty_file_is_rejected(client, admin_headers, upload_dir):
    response = upload(client, admin_headers, "empty.png", b"")
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "bad_image_type"


def test_pdf_is_rejected(client, admin_headers, upload_dir):
    response = upload(client, admin_headers, "doc.pdf", b"%PDF-1.7\n" + b"0" * 32)
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "bad_image_type"


def test_svg_is_rejected(client, admin_headers, upload_dir):
    """SVG سكربت قابل للتنفيذ — ليس في قائمة الصيغ المسموحة."""
    response = upload(
        client, admin_headers, "logo.svg", b"<svg xmlns='http://www.w3.org/2000/svg'/>"
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# أسماء الملفات
# ---------------------------------------------------------------------------


def test_original_filename_is_not_used(client, admin_headers, upload_dir):
    """لا حقن مسار ولا كشف لاسم الملف الأصلي."""
    path = upload(
        client, admin_headers, "../../evil name.png", PNG_BYTES
    ).get_json()["data"]["path"]
    assert ".." not in path
    assert "evil name" not in path
    stored = upload_dir / "products" / path.rsplit("/", 1)[-1]
    assert stored.is_file()


def test_uploaded_name_is_random(client, admin_headers, upload_dir):
    """اسمان مختلفان لنفس الصورة ينتجان ملفين مختلفين (لا الكتابة فوق)."""
    first = upload(client, admin_headers, "same.png", PNG_BYTES).get_json()["data"]["path"]
    second = upload(client, admin_headers, "same.png", PNG_BYTES).get_json()["data"]["path"]
    assert first != second


# ---------------------------------------------------------------------------
# سقف الحجم
# ---------------------------------------------------------------------------


def test_oversized_upload_returns_413(client, admin_headers, app, upload_dir):
    app.config["PRODUCT_MAX_BYTES"] = 1024
    response = upload(client, admin_headers, "big.png", PNG_BYTES + b"0" * 4096)
    assert response.status_code == 413


def test_image_larger_than_global_json_cap_is_accepted(
    client, admin_headers, app, upload_dir
):
    """الصورة تتجاوز سقف JSON العام (64KB) — الرفع يجب ألا يرفضها.

    هذا هو الانحدار الذي كان يمنع رفع أي صورة حقيقية: السقف العام كان يُطبَّق
    على الرفع، فيرفض كل صورة أكبر من 64KB بـ`413`.
    """
    body = PNG_BYTES + b"0" * (400 * 1024)
    assert len(body) > app.config["MAX_CONTENT_LENGTH"]
    assert upload(client, admin_headers, "big.png", body).status_code == 201


def test_json_cap_still_applies_after_upload(client, admin_headers, app, upload_dir):
    """رفع السقف خاص بطلب الرفع فقط — طلب JSON كبير يبقى مرفوضاً."""
    upload(client, admin_headers, "product.png", PNG_BYTES + b"0" * (400 * 1024))
    oversized = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "x" * (100 * 1024)},
    )
    assert oversized.status_code == 413


def test_json_cap_still_applies_after_rejected_upload(
    client, admin_headers, app, upload_dir
):
    """رفض ملف لا يغيّر شيئاً: طلب JSON كبير بعده يبقى مرفوضاً."""
    upload(client, admin_headers, "evil.png", b"not-an-image")
    oversized = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "x" * (100 * 1024)},
    )
    assert oversized.status_code == 413


def test_uploaded_image_appears_in_storefront(client, admin_headers, upload_dir):
    """المسار المخزَّن يصل المتجر كما هو — التطبيع يحدث في الواجهة."""
    path = upload(client, admin_headers, "product.png", PNG_BYTES).get_json()["data"]["path"]
    client.post(
        "/api/v1/admin/products",
        json={
            "slug": "storefront-upload",
            "sku": "UPL-2",
            "name_en": "Storefront Upload",
            "name_ar": "منتج مرفوع",
            "price": "99.00",
            "images": [{"url": path}],
        },
        headers=admin_headers,
    )
    detail = client.get("/api/v1/products/storefront-upload")
    assert detail.status_code == 200
    assert detail.get_json()["data"]["images"][0]["url"] == path


# ---------------------------------------------------------------------------
# خدمة الملفات — لا تعداد مجلد ولا تجاوز مسار
# ---------------------------------------------------------------------------


def test_uploads_directory_is_not_listed(client, upload_dir):
    assert client.get("/uploads/").status_code == 404
    assert client.get("/uploads").status_code == 404


def test_path_traversal_on_serving_is_blocked(client, admin_headers, upload_dir):
    response = client.get("/uploads/../app/config.py")
    assert response.status_code == 404


def test_missing_upload_returns_404(client, upload_dir):
    assert client.get("/uploads/products/does-not-exist.png").status_code == 404


def test_upload_folder_change_after_boot_is_honoured(app, client, admin_headers, tmp_path):
    """الكتابة والقراءة تلتقيان نفس المجلد حتى لو تغيّر بعد الإقلاع."""
    original = app.config["UPLOAD_FOLDER"]
    later = tmp_path / "relocated"
    app.config["UPLOAD_FOLDER"] = str(later)
    try:
        path = upload(client, admin_headers, "product.png", PNG_BYTES).get_json()["data"]["path"]
        # الملف كُتب في المجلد الجديد…
        assert (later / "products" / path.rsplit("/", 1)[-1]).is_file()
        # …ويُقدَّم من نفس المكان، لا من المجلد القديم المقفول عند الإقلاع.
        assert client.get(path).status_code == 200
    finally:
        app.config["UPLOAD_FOLDER"] = original


# ---------------------------------------------------------------------------
# نفس آلية البنرات — التقوية مشتركة
# ---------------------------------------------------------------------------


def test_banner_upload_shares_the_same_hardening(client, app, upload_dir):
    """البنرات تستخدم الوحدة نفسها، فمularioّ exec المزيف مرفوض هناك أيضاً."""
    login = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    headers = {"Authorization": f"Bearer {login.get_json()['data']['accessToken']}"}
    response = client.post(
        "/api/v1/admin/banners/upload",
        data={"file": (io.BytesIO(b"MZ\x90\x00" + b"0" * 64), "evil.exe.png")},
        content_type="multipart/form-data",
        headers=headers,
    )
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "bad_image_type"


def test_banner_upload_still_accepts_real_images(client, upload_dir):
    login = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@shelight.com", "password": "admin12345"},
    )
    headers = {"Authorization": f"Bearer {login.get_json()['data']['accessToken']}"}
    response = client.post(
        "/api/v1/admin/banners/upload",
        data={"file": (io.BytesIO(PNG_BYTES), "banner.png")},
        content_type="multipart/form-data",
        headers=headers,
    )
    assert response.status_code == 201
    assert response.get_json()["data"]["path"].startswith("/uploads/banners/")
