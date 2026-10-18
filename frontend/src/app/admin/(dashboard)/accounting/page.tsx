import type { Metadata } from 'next'
import { AccountingManager } from '@/features/admin/components/accounting-manager'

export const metadata: Metadata = {
  title: 'الحسابات والأرباح',
}

export default function AccountingPage() {
  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-plum">
        الحسابات والأرباح
      </h1>
      <p className="mb-6 text-sm text-muted">
        سجّل تكلفة المنتجات وتابع مبيعات المنتجات المسلّمة وأرباحها.
      </p>
      <AccountingManager />
    </div>
  )
}
