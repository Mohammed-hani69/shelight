'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLoginForm } from '@/features/admin/components/admin-login-form'
import { useAdminStore } from '@/store/admin-store'

/** صفحة دخول المدير — خارج الـ layout المحمي، لكنها تعيد التوجيه إن وُجدت جلسة صالحة. */
export default function AdminLoginPage() {
  const router = useRouter()
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated)
  const isAdmin = useAdminStore((s) => s.customer?.isAdmin)

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      router.replace('/admin')
    }
  }, [isAuthenticated, isAdmin, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-card">
        <h1 className="mb-1 font-display text-2xl font-semibold text-plum">لوحة تحكم SHE LIGHT</h1>
        <p className="mb-6 text-sm text-muted">أدخل بيانات حساب المدير للمتابعة.</p>
        <AdminLoginForm />
      </div>
    </div>
  )
}