import { config } from '@/config/site'
import { ApiError, NetworkError } from '@/lib/api/errors'

/**
 * عميل الـ API المركزي.
 * يتكفل بالـ base URL، الهيدرز، المصادقة، الأخطاء، وتحليل JSON.
 * كل خدمات الدومين (products, cart, auth...) تستخدم هذا العميل.
 */

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  auth?: boolean
  timeout?: number
}

interface ApiResponseBody<T> {
  success: boolean
  data: T
  meta?: unknown
  message?: string
  error?: {
    code: string
    message?: string
    fields?: Record<string, unknown>
    details?: Record<string, unknown>
  }
}

/** نتيجة الطلب مع بيانات الترقيم التي يرسلها الـ backend في `meta`. */
export interface ApiResult<T, M = unknown> {
  items: T
  meta?: M
}

let authToken: string | null = null

/** تعيين توكن المصادقة ليُستخدم في الطلبات اللاحقة */
export function setAuthToken(token: string | null): void {
  authToken = token
}

/** القراءة الحالية للتوكن (للاستخدام داخل الحالة) */
export function getAuthToken(): string | null {
  return authToken
}

/**
 * التنفيذ الأساسي: يعيد الـ envelope كاملاً (data + meta) لأن استجابات
 * القوائم تحتاج الترقيم الذي يقع خارج `data`.
 */
async function send<T, M = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T, M>> {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true,
    timeout = config.api.timeout,
  } = options

  const url = `${config.api.baseUrl}${path}`

  // multipart: نترك المتصفح يضبط Content-Type مع الـ boundary، ولا نُسلسل الجسم.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const finalHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...headers,
  }

  if (auth && authToken) {
    finalHeaders.Authorization = `Bearer ${authToken}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new NetworkError('انتهت مهلة الطلب.')
    }
    throw new NetworkError('تعذّر الوصول إلى الخادم.', error)
  }
  clearTimeout(timer)

  let payload: ApiResponseBody<T> | null = null
  try {
    payload = (await response.json()) as ApiResponseBody<T>
  } catch {
    // بعض الاستجابات قد لا تحتوي على JSON
  }

  if (!response.ok) {
    // رسالة الخادم تصل متداخلة داخل `error`، مع دعم الشكل القديم في الجذر.
    const message =
      payload?.error?.message ?? payload?.message ?? `فشل الطلب بحالة ${response.status}`
    const code = payload?.error?.code ?? 'UNKNOWN_ERROR'
    const fields = payload?.error?.fields ?? payload?.error?.details
    throw new ApiError(message, response.status, code, fields)
  }

  return { items: payload?.data as T, meta: payload?.meta as M | undefined }
}

/** يعيد `data` فقط — والاستخدام الافتراضي في كل الـ adapters. */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { items } = await send<T>(path, options)
  return items
}

//----- واجهات منفصلة لتجنب الغموض -----
export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),

  getWithMeta: <T, M = unknown>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    send<T, M>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),

  /** POST بملف multipart — تُترك ترويسة Content-Type للمتصفح. */
  postForm: <T>(path: string, formData: FormData, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body: formData }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
