import type { Metadata } from 'next'
import { BannersManager } from '@/features/admin/components/banners-manager'

export const metadata: Metadata = {
  title: 'البنرات',
}

export default function AdminBannersPage() {
  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-plum">بنرات الرئيسية</h1>
      <BannersManager />
    </div>
  )
}
