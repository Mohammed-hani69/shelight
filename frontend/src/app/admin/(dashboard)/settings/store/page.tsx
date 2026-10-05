import { StoreSettingsManager } from '@/features/admin/components/store-settings-manager'

export default function StoreSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum">إعدادات المتجر</h1>
        <p className="mt-1 text-sm text-muted">إدارة رسوم المحافظات والشحن المجاني والتواصل مع العملاء.</p>
      </div>
      <StoreSettingsManager />
    </div>
  )
}