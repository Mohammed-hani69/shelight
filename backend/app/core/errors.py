"""معالجة مركزيّة للأخطاء — توحّد شكل استجابات الخطأ عبر الـ API كاملاً.

الهدف أن يستهلك عميل الواجهة صيغة واحدة دائماً:
    {"error": {"code": "...", "message": "...", "fields": {...؟}}}
"""
from __future__ import annotations

from flask import jsonify
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException

STATUS_TEXT = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    422: "unprocessable_entity",
    500: "internal_error",
}

# رسائل عربية لأخطاء HTTP التي لم يُسجَّل لها معالج خاص.
HTTP_MESSAGE = {
    400: "الطلب غير صالح",
    405: "طريقة الطلب غير مدعومة لهذا المسار",
    413: "حجم الطلب أكبر من المسموح",
    415: "نوع المحتوى غير مدعوم",
    422: "البيانات المُرسلة غير صالحة",
}


class ApiError(Exception):
    """خطأ معروف في منطق العمل يتحوّل إلى استجابة JSON برمز معيّن."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str | None = None,
        *,
        fields: dict | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code or STATUS_TEXT.get(status_code, "bad_request")
        self.fields = fields


def _error_body(err: ApiError) -> dict:
    payload: dict = {"error": {"code": err.code, "message": err.message}}
    if err.fields:
        payload["error"]["fields"] = err.fields
    return payload


def register_error_handlers(app) -> None:
    """تسجيل كل معالجات الأخطاء على نسخة التطبيق."""

    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        return jsonify(_error_body(err)), err.status_code

    @app.errorhandler(ValidationError)
    def handle_validation_error(err: ValidationError):
        response = ApiError(
            "بيانات الإدخال غير صحيحة",
            status_code=422,
            code="validation_error",
            fields=err.messages,
        )
        return jsonify(_error_body(response)), 422

    @app.errorhandler(404)
    def handle_not_found(_err):
        err = ApiError("الموارد المطلوب غير موجودة", status_code=404)
        return jsonify(_error_body(err)), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(_err):
        err = ApiError("طريقة الطلب غير مدعومة لهذا المسار", status_code=405)
        return jsonify(_error_body(err)), 405

    # خطأ HTTP (413 حجم كبير، 415 نوع محتوى، 400 طلب سيّئ...) خطأ عميل
    # لا عطل خادم. بدون هذا المعالج يبتلعه `Exception` فيُعاد 500 مع
    # traceback كامل في السجل لكل خطأ إدخال عادي.
    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        code = err.code or 500
        response = ApiError(HTTP_MESSAGE.get(code, "تعذّر تنفيذ الطلب"), status_code=code)
        return jsonify(_error_body(response)), code

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):
        app.logger.exception("خطأ غير متوقع: %s", err)
        response = ApiError("حدث خطأ غير متوقع", status_code=500)
        return jsonify(_error_body(response)), 500