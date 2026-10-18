import type { Metadata } from 'next'
import { ReferralsManager } from '@/features/admin/components/referrals-manager'

export const metadata: Metadata = {
  title: 'الإحالات',
}

export default function AdminReferralsPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">الإحالات</h1>
      <ReferralsManager />
    </div>
  )
}
