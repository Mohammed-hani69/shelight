import { config } from '@/config/site'

/**
 * يحوّل مسار ملف نسبياً (مثل صور البنرات المرفوعة `/uploads/...`) إلى رابط
 * مطلق على نطاق الـ API، ويترك الروابط الخارجية كما هي.
 */
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
  const origin = config.api.baseUrl.replace(/\/api\/v\d+\/?$/, '')
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}
