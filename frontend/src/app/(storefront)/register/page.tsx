import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/components/register-form'

export const metadata: Metadata = {
  title: 'إنشاء حساب',
  description: 'أنشئي حساباً في شيلايت لتتبعي طلباتك وتحفظي مفضلاتك.',
}

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-plum">إنشاء حساب</h1>
        <p className="mt-2 text-sm text-muted">انضمي إلى شيلايت لتجربة مخصصة</p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8">
        <RegisterForm />
      </div>
    </div>
  )
}
