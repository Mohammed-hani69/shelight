'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { getAuthToken } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/store/admin-store'

interface AdminGuardProps {
  children: React.ReactNode
}

/**
 * حارس لوحة التحكم: بلا توكن → صفحة الدخول،
 * ومع توكن غير صالح (أو حساب غير مدير) → مسح الجلسة والعودة للدخول.
 *
 * ننتظر اكتمال إعادة بناء الحالة من التخزين (`persist`) قبل توجيه أي شيء.
 * بلا ذلك، عند التحديث الكامل للصفحة تكون الحالة افتراضية (بلا توكن) لحظة
 * تشغيل الأثر فيقفز الحارس للدخول، ثم تعود صفحة الدخول للوحة فور اكتمال
 * إعادة البناء — فيفقد المستخدم مساره في اللوحة.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter()
  const token = useAdminStore((s) => s.token)
  const customer = useAdminStore((s) => s.customer)
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated)
  const fetchMe = useAdminStore((s) => s.fetchMe)
  const hydrated = useSyncExternalStore(
    (onChange) => useAdminStore.persist.onFinishHydration(onChange),
    () => useAdminStore.persist.hasHydrated(),
    () => false
  )

  // عند العودة من صفحة الدخول بعد تسجيل الدخول، قد تكون الجلسة مخزّنة
  // لكن `fetchMe` (عبر إعادة البناء من التخزين) لم يتحقق من `isAdmin` بعد.
  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      router.replace('/admin/login')
      return
    }
    if (getAuthToken() !== token) {
      // توكن مخزّن لم يُحقن في عميل الـ API بعد.
      import('@/lib/api/client').then(({ setAuthToken }) => setAuthToken(token))
    }
    // مع وجود customer محمَّل بالفعل لكن الجلسة أُعيد بناؤها، مثلّث
    // التحقق من `isAdmin` من تلخيص fetchMe أثناء إعادة البناء.
    if (!customer) {
      void fetchMe()
    }
  }, [hydrated, token, customer, fetchMe, router])

  if (!hydrated || !isAuthenticated || !customer || !customer.isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted">جارٍ التحقق من الجلسة…</p>
      </div>
    )
  }

  return <>{children}</>
}