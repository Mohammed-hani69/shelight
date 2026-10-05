'use client'

import { Truck } from 'lucide-react'
import { useI18n } from '@/lib/i18n/use-i18n'
import { useStoreSettings } from '@/features/store-settings/use-store-settings'
import { formatPrice } from '@/lib/utils/format-price'

/** شريط الإعلانات أعلى الصفحة */
export function AnnouncementBar() {
  const { locale, t } = useI18n()
  const settings = useStoreSettings()
  const fallback = t.announcement.freeShipping.replace(
    '{threshold}',
    formatPrice(settings.freeShippingThreshold),
  )
  const text = ((locale === 'ar' ? settings.announcementAr : settings.announcementEn) || fallback)
    .replace('{threshold}', formatPrice(settings.freeShippingThreshold))

  return (
    <div className="bg-plum text-cream">
      <div className="container-shelight flex min-h-9 items-center justify-center gap-2 overflow-hidden py-1.5 text-center">
        <Truck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
        <p className="line-clamp-2 text-xs leading-5">{text || t.announcement.freeShipping}</p>
      </div>
    </div>
  )
}