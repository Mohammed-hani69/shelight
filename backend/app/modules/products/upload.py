"""رفع صور المنتجات — حفظ آمن على القرص وإرجاع مسار نسبي.

نفس آلية رفع البنرات (`/admin/banners/upload`) لكن لمسار مستقل
`uploads/products/` حتى لا تختلط صور المنتج بصور البنر، ولكل مجلد سقف حجم
مختلف.

لماذا وحدة مشتركة بدل تكرار الكود في كلBlueprint:
    منطق الرفع (قراءة `request.files`، رفع السقف مؤقتاً، التحقق، الحفظ، تسمية
    عشوائية) واحد. تكراره يعني أن أي إصلاح أمني — كالتحقق من البايتات السحرية —
    سيُطبَّق على مسار ويُنسى على الآخر.

التحقق من نوع الملف *لا يعتمد على الامتداد وحده*:
    الامتداد يتحكّم فيه المُرسِل، فاسم `photo.png` قد يحمل أي بايتات. نتحقق من
    البايتات السحرية (magic bytes) لكل صيغة، وهذا ما يمنع رفع ملف تنفيذي باسم
    `.png`. الامتداد يبقى مشتقاً من الصيغة المكتشفة لا من اسم الملف المُرسَل.

الأسماء تُولَّد بـ ``uuid4().hex`` ولا تُشتق من اسم الملف الأصلي، فلا مجال
لحقن مسار (``../../``) أو لكتابة فوق ملف موجود.
"""
from __future__ import annotations

import os
from typing import Final
from uuid import uuid4

from flask import current_app, request
from werkzeug.datastructures import FileStorage

from app.core.errors import ApiError

#: الصيغ المسموحة -> البايتات السحرية التي تُثبِت أن الملف صورة فعلاً.
#:
#: كل قيمة tuple من `(signature, offset)` تُقرأ من الملف وتُقارن. `offset`
#: يسمح لفحص بصمة داخل الملف لا في أوله (WebP وAVIF يبدآن بعلامة
#: RIFF/ftyp، فالبصمة ليست عند الإزاحة صفر).
IMAGE_SIGNATURES: Final[dict[str, tuple[bytes, int]]] = {
    "png": (b"\x89PNG\r\n\x1a\n", 0),
    "jpg": (b"\xff\xd8\xff", 0),
    "jpeg": (b"\xff\xd8\xff", 0),
    "gif": (b"GIF87a", 0),
    "gif89a": (b"GIF89a", 0),
    "webp": (b"WEBP", 8),
    "avif": (b"ftypavif", 4),
}

#: امتداد يُقبل لكل صيغة عند التحقق من البصمة.
#: نُعيد الامتداد القياسي (`jpg` لا `jpeg`) حتى يكون المسار متسقاً.
_CANONICAL_EXT: Final[dict[str, str]] = {
    "png": "png",
    "jpg": "jpg",
    "jpeg": "jpg",
    "gif87a": "gif",
    "gif89a": "gif",
    "webp": "webp",
    "avif": "avif",
}

#: أقصى بايتات نقرأها من الملف للتحقق من البصمة — يكفي رأس أي صيغة.
_SIGNATURE_PROBE_BYTES: Final[int] = 32


def detect_image_extension(head: bytes) -> str | None:
    """يرجع الامتداد القياسي للصورة المشكوك في نوعها، أو None.

    يفحص كل الصيغ المعروفة ويطابق البصمة على إزاحتها الصحيحة. لا يستخدم
    امتداد الملف ولا اسمه إطلاقاً.
    """
    for marker, (signature, offset) in IMAGE_SIGNATURES.items():
        if head[offset : offset + len(signature)] == signature:
            return _CANONICAL_EXT[marker]
    return None


def save_uploaded_image(*, subdir: str, max_bytes_key: str) -> str:
    """يتحقق من صورة مرفوعة ويحفظها، ويعيد المسار النسبي `/uploads/...`.

    ``max_bytes_key`` اسم مفتاح الإعدادات الذي يحمل السقف (مثل
    ``PRODUCT_MAX_BYTES``) بدل تمرير رقم، حتى تتبع كل نقطة حدّها المعلن في
    ``.env`` بدل قيمة مثبتة في الكود.

    الملف يُقرأ هنا لا من المُستدعي عن قصد: تمرير ``request.files`` كوسيط
    يجعل Python يقرأ الجسم *قبل* دخول الدالة، أي قبل رفع السقف، فيبقى السقف
    العام 64KB هو الساري.
    """
    # السقف يُرفع **قبل** قراءة `request.files`، لا بعدها.
    #
    # السقف العام 64KB مخصص لطلبات JSON، وصورة منتج حقيقية تتجاوزه ببساطة،
    # فلولا رفع السقف لكان `413` على كل صورة عادية.
    #
    # نستخدم `request.max_content_length` — قابل للضبط لكل طلب في Flask 3.1 —
    # بدل تعديل `current_app.config["MAX_CONTENT_LENGTH"]` المشترك. تعديل
    # الإعدادات المشتركة كان معطوباً على ثلاث وجوه:
    #   1. `admin_required` يقرأ جسم الطلب قبل الدخول إلى جسم الدالة، فيُطبَّق
    #      السقف العام أولاً ويُرفض كل صورة أكبر من 64KB بـ`413`.
    #   2. الإعداد حالة مشتركة بين الخيوط: طلب JSON يصل أثناء رفعٍ جارٍ يقرأ
    #      سقفاً مرفوعاً بالخطأ (سباق بيانات).
    #   3. رفع السقف كان ملفوفاً بـ`finally`، فاستثناء أثناء القراءة كان
    #      يُبتلع بدل أن يتحول إلى رد مناسب.
    request.max_content_length = current_app.config[max_bytes_key]
    received = request.files.get("file")

    if received is None or not received.filename:
        raise ApiError("لم يتم اختيار ملف", status_code=422, code="no_file")

    head = received.stream.read(_SIGNATURE_PROBE_BYTES)
    extension = detect_image_extension(head)
    if extension is None:
        raise ApiError(
            "الملف ليس صورة صالحة (المسموح: png, jpg, jpeg, webp, gif, avif)",
            status_code=422,
            code="bad_image_type",
        )

    # نُعيد المؤشر للأمام: البايتات التي قُرئت للتحقق كانت ستُكتب أول الملف.
    received.stream.seek(0)

    folder = os.path.join(current_app.config["UPLOAD_FOLDER"], subdir)
    os.makedirs(folder, exist_ok=True)
    # اسم عشوائي: لا يُشتق من اسم المُرسَل، فلا حقن مسار ولا كتابة فوق موجود.
    filename = f"{uuid4().hex}.{extension}"
    received.save(os.path.join(folder, filename))
    return f"/uploads/{subdir}/{filename}"
