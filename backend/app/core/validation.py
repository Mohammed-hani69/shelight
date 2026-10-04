"""قيود الإدخال المشتركة — مصدر واحد لقواعد كلمة المرور والحقول النصية.

قبل هذا الملف كان كل نموذج يعيد تعريف نفس القواعد بنفس النص، وأي تعديل
في أحدها يترك الباقي متخلفاً. الآن أي تغيير هنا يسري على كل النماذج.
"""
from __future__ import annotations

from marshmallow import fields, validate

FIELD_ERRORS = {
    "required": "الحقل مطلوب",
    "invalid": "القيمة غير صالحة",
}

PASSWORD_MIN_LENGTH = 8
# سقف أعلى من 8 أحرف: كلمة المرور الأطول بكثير تجبر الخادم على تجزئة
# ضخمة (مخ denial of service)، ولا تضيف حماية عملية بعد حد معين.
PASSWORD_MAX_LENGTH = 128
NAME_MAX_LENGTH = 100
PHONE_MAX_LENGTH = 32

PASSWORD_LENGTH_ERROR = (
    f"كلمة المرور يجب أن تكون بين {PASSWORD_MIN_LENGTH} "
    f"و{PASSWORD_MAX_LENGTH} حرفاً"
)
NAME_LENGTH_ERROR = f"الاسم يجب ألا يتجاوز {NAME_MAX_LENGTH} حرفاً"
PHONE_LENGTH_ERROR = f"رقم الهاتف يجب ألا يتجاوز {PHONE_MAX_LENGTH} حرفاً"


def password_field(*, data_key: str | None = None, **kwargs) -> fields.Str:
    """حقل كلمة مرور بنفس حدود الطول في كل النماذج."""
    return fields.Str(
        load_only=True,
        data_key=data_key or "password",
        validate=validate.Length(
            min=PASSWORD_MIN_LENGTH, max=PASSWORD_MAX_LENGTH, error=PASSWORD_LENGTH_ERROR
        ),
        **kwargs,
    )


def name_field(data_key: str, *, required: bool = False, **kwargs) -> fields.Str:
    return fields.Str(
        required=required,
        data_key=data_key,
        validate=validate.Length(min=2, max=NAME_MAX_LENGTH, error=NAME_LENGTH_ERROR),
        **kwargs,
    )


def phone_field(*, required: bool = False, **kwargs) -> fields.Str:
    return fields.Str(
        required=required,
        allow_none=True,
        data_key="phone",
        validate=validate.Length(max=PHONE_MAX_LENGTH, error=PHONE_LENGTH_ERROR),
        **kwargs,
    )