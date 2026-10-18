'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Truck } from 'lucide-react'
import { useI18n } from '@/lib/i18n/use-i18n'
import { useStoreSettings } from '@/features/store-settings/use-store-settings'
import { formatPrice } from '@/lib/utils/format-price'
import { bundleService } from '@/features/bundles/services/bundle-service'
import { marketingSectionsService } from '@/features/marketing-sections/marketing-sections-service'

interface AnnouncementItem {
  id: string
  title: string
  href: string
}

/** شريط الإعلانات أعلى الصفحة */
export function AnnouncementBar() {
  const { locale, t } = useI18n()
  const settings = useStoreSettings()
  const [items, setItems] = useState<AnnouncementItem[]>([])
  const fallback = t.announcement.freeShipping.replace(
    '{threshold}',
    formatPrice(settings.freeShippingThreshold),
  )
  const text = ((locale === 'ar' ? settings.announcementAr : settings.announcementEn) || fallback)
    .replace('{threshold}', formatPrice(settings.freeShippingThreshold))

  useEffect(() => {
    let active = true
    Promise.allSettled([
      bundleService.list(),
      marketingSectionsService.getOfferPopup(),
      marketingSectionsService.getReferralCampaign(),
    ]).then(([bundlesResult, offersResult, referralResult]) => {
      if (!active) return

      const announcements: AnnouncementItem[] = []
      if (bundlesResult.status === 'fulfilled') {
        announcements.push(...bundlesResult.value.map((bundle) => ({
          id: `bundle-${bundle.id}`,
          title: bundle.name,
          href: `/bundles#${encodeURIComponent(bundle.slug)}`,
        })))
      } else {
        console.error('تعذّر تحميل عناوين الباقات للشريط العلوي', bundlesResult.reason)
      }
      if (offersResult.status === 'fulfilled' && offersResult.value?.isActive) {
        announcements.push(...offersResult.value.products.map((product) => ({
          id: `offer-${product.id}`,
          title: product.name,
          href: `/products/${encodeURIComponent(product.slug)}`,
        })))
      } else if (offersResult.status === 'rejected') {
        console.error('تعذّر تحميل عناوين العروض للشريط العلوي', offersResult.reason)
      }
      if (referralResult.status === 'fulfilled' && referralResult.value?.isActive) {
        announcements.push({
          id: 'referral-campaign',
          title: referralResult.value.title,
          href: '/invite',
        })
      } else if (referralResult.status === 'rejected') {
        console.error('تعذّر تحميل عنوان حملة الدعوة للشريط العلوي', referralResult.reason)
      }

      setItems(announcements)
    })

    return () => {
      active = false
    }
  }, [])

  const announcement = (
    <span className="flex shrink-0 items-center gap-2 px-5">
      <Truck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
      <span>{text || t.announcement.freeShipping}</span>
    </span>
  )

  const renderItems = (copy: boolean) => (
    <div
      className="flex shrink-0 items-center"
      aria-hidden={copy ? true : undefined}
    >
      {announcement}
      {items.map((item) => (
        <span key={item.id} className="flex shrink-0 items-center gap-5 px-5">
          <Image
            src="/images/iconlogorem.png"
            alt=""
            width={24}
            height={24}
            className="h-5 w-5 shrink-0 object-contain"
            aria-hidden="true"
          />
          <Link
            href={item.href}
            tabIndex={copy ? -1 : undefined}
            className="whitespace-nowrap transition-colors hover:text-accent"
          >
            {item.title}
          </Link>
        </span>
      ))}
    </div>
  )

  return (
    <div className="bg-plum text-cream" dir="ltr">
      <div
        className="overflow-hidden py-2 text-xs leading-5"
        role="region"
        aria-label="عناوين الباقات والعروض"
      >
        <div className="announcement-marquee flex w-max items-center text-center hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
          {renderItems(false)}
          {items.length > 0 ? renderItems(true) : announcement}
        </div>
      </div>
    </div>
  )
}