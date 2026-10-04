import { trackingClient } from '@/features/tracking/tracking-client'

/**
 * تهيئة عميل التتبّع قبل تفاعل التطبيق + تسجيل أول مشاهدة صفحة.
 * ملف clientside يُنفَّذ مرة واحدة عند إقلاع التطبيق في المتصفح.
 */
try {
  trackingClient.init()
  trackingClient.track('page_view')
} catch {
  // فشل التتبّع لا يجب أن يعطّل التطبيق.
}

/** كل انتقال بين صفحات App Router يُسجَّل كمشاهدة صفحة. */
export function onRouterTransitionStart(url: string) {
  try {
    trackingClient.track('page_view', { path: url })
  } catch {
    // تجاهل
  }
}
