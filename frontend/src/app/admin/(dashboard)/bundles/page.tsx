import type { Metadata } from 'next'
import { BundlesManager } from '@/features/admin/components/bundles-manager'

export const metadata: Metadata = {
  title: 'الباقات',
}

export default function AdminBundlesPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">الباقات</h1>
      <BundlesManager />
    </div>
  )
}