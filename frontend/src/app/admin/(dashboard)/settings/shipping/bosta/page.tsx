import type { Metadata } from 'next'
import { BostaSettingsManager } from '@/features/admin/components/bosta-settings-manager'

export const metadata: Metadata = {
  title: 'Bosta',
}

export default function BostaSettingsPage() {
  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-plum">إعدادات الشحن</h1>
      <BostaSettingsManager />
    </div>
  )
}
