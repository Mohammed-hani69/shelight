import type { Metadata } from 'next'
import { SarieeSettingsManager } from '@/features/admin/components/sariee-settings-manager'

export const metadata: Metadata = {
  title: 'الشحن - سريع',
}

export default function SarieeShippingPage() {
  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-plum">الشحن - سريع</h1>
      <SarieeSettingsManager />
    </div>
  )
}
