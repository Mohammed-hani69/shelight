import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/components/login-form'

export const metadata: Metadata = {
  title: 'دخول حسابك',
  description: 'سجّلي دخولك لحسابك في شيلايت.',
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-plum">نورتي تاني</h1>
        <p className="mt-2 text-sm text-muted">سجّلي دخولك لحسابك في شيلايت</p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8">
        <LoginForm />
      </div>
    </div>
  )
}
