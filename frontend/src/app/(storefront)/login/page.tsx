import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/components/login-form'

export const metadata: Metadata = {
  title: 'تسجيل الدخول',
  description: 'سجّلي الدخول إلى حسابك في شيلايت.',
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-plum">مرحباً بعودتك</h1>
        <p className="mt-2 text-sm text-muted">سجّلي الدخول إلى حسابك في شيلايت</p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8">
        <LoginForm />
      </div>
    </div>
  )
}
