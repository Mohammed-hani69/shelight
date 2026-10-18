'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
  const [copies, setCopies] = useState(2)
  const [sequenceWidth, setSequenceWidth] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const sequenceRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const viewport = viewportRef.current
    const sequence = sequenceRef.current
    if (!viewport || !sequence) return

    const updateMarquee = () => {
      const width = sequence.getBoundingClientRect().width
      if (!width) return
      setSequenceWidth(width)
      setCopies(Math.max(2, Math.ceil(viewport.clientWidth / width) + 2))
    }

    updateMarquee()
    const observer = new ResizeObserver(updateMarquee)
    observer.observe(viewport)
    observer.observe(sequence)
    return () => observer.disconnect()
  }, [items, text])

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

  const duration = sequenceWidth > 0 ? Math.max(18, sequenceWidth / 32) : 38
  const marqueeStyle = {
    animationDuration: `${duration}s`,
    '--marquee-distance': `${sequenceWidth}px`,
  } as CSSProperties

  return (
    <div className="bg-plum text-cream" dir="ltr">
      <div
        ref={viewportRef}
        className="overflow-hidden py-2 text-xs leading-5"
        role="region"
        aria-label="عناوين الباقات والعروض"
      >
        <div
          className="announcement-marquee flex w-max items-center text-center hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
          style={marqueeStyle}
        >
          {Array.from({ length: copies }, (_, index) => (
            <div
              key={index}
              ref={index === 0 ? sequenceRef : undefined}
              className="flex shrink-0 items-center"
            >
              {renderItems(index !== 0)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}