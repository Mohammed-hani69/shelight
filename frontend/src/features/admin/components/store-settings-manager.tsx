'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Save, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminApi } from '@/features/admin/services/admin-api'
import { ErrorState } from '@/features/admin/components/error-state'
import { DEFAULT_STORE_SETTINGS, GOVERNORATE_OPTIONS, type StoreSettings } from '@/features/store-settings/store-settings'
import { friendlyMessage } from '@/lib/api/errors'

export function StoreSettingsManager() {
  const [form, setForm] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    adminApi.getStoreSettings()
      .then((settings) => {
        if (active) setForm({ ...DEFAULT_STORE_SETTINGS, ...settings })
      })
      .catch((cause) => {
        if (active) setError(friendlyMessage(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const saved = await adminApi.saveStoreSettings(form)
      setForm({ ...DEFAULT_STORE_SETTINGS, ...saved })
      toast.success('تم حفظ إعدادات المتجر')
    } catch (cause) {
      toast.error(friendlyMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted">جارٍ تحميل إعدادات المتجر…</p>

  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      <form onSubmit={save} className="space-y-5">
        <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-plum">الشحن والتوصيل</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="default-shipping">سعر الشحن الافتراضي (جنيه)</Label>
              <Input id="default-shipping" type="number" min="0" step="0.01" value={form.defaultShippingFee} onChange={(event) => setForm((prev) => ({ ...prev, defaultShippingFee: Number(event.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="free-shipping-threshold">الحد الأدنى للشحن المجاني (جنيه)</Label>
              <Input id="free-shipping-threshold" type="number" min="0" step="1" value={form.freeShippingThreshold} onChange={(event) => setForm((prev) => ({ ...prev, freeShippingThreshold: Number(event.target.value) }))} />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GOVERNORATE_OPTIONS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <Label htmlFor={`shipping-${key}`} className="text-sm">{label}</Label>
                <div className="flex w-32 items-center gap-2">
                  <Input id={`shipping-${key}`} type="number" min="0" step="0.01" aria-label={`سعر الشحن إلى ${label}`} value={form.governorateFees[key] ?? form.defaultShippingFee} onChange={(event) => setForm((prev) => ({ ...prev, governorateFees: { ...prev.governorateFees, [key]: Number(event.target.value) } }))} />
                  <span className="text-xs text-muted">ج.م</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-plum">التواصل والشريط العلوي</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="whatsapp-phone">رقم واتساب مع مفتاح الدولة</Label>
              <Input id="whatsapp-phone" type="tel" dir="ltr" inputMode="tel" placeholder="201xxxxxxxxx" value={form.whatsappPhone} onChange={(event) => setForm((prev) => ({ ...prev, whatsappPhone: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement-ar">محتوى الشريط العلوي بالعربية</Label>
              <Input id="announcement-ar" maxLength={240} value={form.announcementAr} onChange={(event) => setForm((prev) => ({ ...prev, announcementAr: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement-en">محتوى الشريط العلوي بالإنجليزية</Label>
              <Input id="announcement-en" dir="ltr" maxLength={240} value={form.announcementEn} onChange={(event) => setForm((prev) => ({ ...prev, announcementEn: event.target.value }))} />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="min-h-11 w-full sm:w-auto">
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'جارٍ الحفظ…' : 'حفظ إعدادات المتجر'}
          </Button>
        </div>
      </form>
    </div>
  )
}