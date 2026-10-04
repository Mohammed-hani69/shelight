'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { useI18n } from '@/lib/i18n/use-i18n'

interface AuthGuardProps {
  children: React.ReactNode
}

/** حارس الصفحات الخاصة — يوجّه للدخول عند عدم وجود حساب */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { t } = useI18n()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted">{t.auth.redirecting}</p>
      </div>
    )
  }

  return <>{children}</>
}