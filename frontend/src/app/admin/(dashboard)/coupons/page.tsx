import type { Metadata } from 'next'
import { CouponsManager } from '@/features/admin/components/coupons-manager'

export const metadata: Metadata = {
  title: 'الكوبونات',
}

export default function AdminCouponsPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">الكوبونات</h1>
      <CouponsManager />
    </div>
  )
}