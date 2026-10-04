/**
 * أنواع الأخطاء الموحدة من الـ API.
 * نطبع أخطاء الشبكة والـ API لتظهر للمستخدم بشكل متسق.
 */

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown> | undefined

  constructor(message: string, status: number, code: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isValidationError(): boolean {
    return this.status === 422
  }
}

export class NetworkError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'NetworkError'
    this.cause = cause
  }
}

/** تحويل استجابة fetch إلى خطأ موحد */
export function normalizeError(error: unknown): Error {
  if (error instanceof ApiError || error instanceof NetworkError) {
    return error
  }
  if (error instanceof Error) {
    return new NetworkError(error.message, error)
  }
  return new Error('حدث خطأ غير متوقع.')
}

/** أكواد الأخطاء العامة التي تُستبدل برسائل عربية ودّية، لا نصوص الخادم. */
const GENERIC_CODES = new Set(['UNKNOWN_ERROR', 'validation_error', 'bad_request', 'not_found'])

/** تحويل كود الحالة إلى رسالة ودية */
export function friendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // أخطاء منطق العمل (الكوبون، المخزون...) تحمل رسالة مفهومة من الخادم،
    // فنعرضها كما هي بدل إخفائها خلف رسالة عامة بحسب كود الحالة.
    if (error.code && !GENERIC_CODES.has(error.code) && error.message) {
      return error.message
    }
    switch (error.status) {
      case 404:
        return 'المورد المطلوب غير موجود.'
      case 401:
        return 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.'
      case 403:
        return 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'
      case 422:
        return 'يرجى التحقق من المعلومات التي أدخلتها والمحاولة مرة أخرى.'
      case 500:
        return 'حدث خطأ ما من جهتنا. يرجى المحاولة لاحقاً.'
      default:
        return error.message
    }
  }
  if (error instanceof NetworkError) {
    return 'تعذّر الوصول إلى خوادمنا. يرجى التحقق من اتصالك.'
  }
  return 'حدث خطأ غير متوقع.'
}
