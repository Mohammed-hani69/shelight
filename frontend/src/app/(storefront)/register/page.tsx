import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/components/register-form'

export const metadata: Metadata = {
  title: 'اعملي حساب',
  description: 'اعملي حساب في شيلايت عشان تتابعي طلباتك وتحفظي منتجاتك المفضلة.',
}

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-plum">اعملي حساب</h1>
        <p className="mt-2 text-sm text-muted">انضمي لشيلايت وخلي تجربتك على مزاجك</p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8">
        <RegisterForm />
      </div>
    </div>
  )
}
