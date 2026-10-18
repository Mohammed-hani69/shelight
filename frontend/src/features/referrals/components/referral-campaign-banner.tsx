'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Gift } from 'lucide-react'
import { MediaImage } from '@/components/common/media-image'
import { marketingSectionsService, type StorefrontSectionContent } from '@/features/marketing-sections/marketing-sections-service'

export function ReferralCampaignBanner() {
  const [campaign, setCampaign] = useState<StorefrontSectionContent | null>(null)

  useEffect(() => {
    let cancelled = false
    marketingSectionsService.getReferralCampaign()
      .then((data) => {
        if (!cancelled) setCampaign(data?.isActive ? data : null)
      })
      .catch((error) => {
        console.error('تعذّر تحميل بانر الإحالة', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!campaign) return null

  return (
    <section className="container py-8 sm:py-12" aria-label="عرض الإحالة">
      <Link
        href="/invite"
        className="group grid overflow-hidden rounded-2xl bg-plum text-cream shadow-card transition-transform hover:-translate-y-0.5 md:grid-cols-2"
      >
        <div className="relative min-h-56 bg-accent/20 md:min-h-80">
          {campaign.imageUrl ? (
            <MediaImage
              src={campaign.imageUrl}
              alt={campaign.title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-56 items-center justify-center">
              <Gift className="h-20 w-20 text-cream/70" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start justify-center p-6 sm:p-10">
          <span className="mb-4 rounded-full bg-cream/15 px-4 py-1.5 text-sm">
            عرض خاص
          </span>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            {campaign.title}
          </h2>
          <p className="mt-3 max-w-lg leading-7 text-cream/80">
            {campaign.description.replaceAll(
              '{rewardPercent}',
              String(campaign.rewardPercent ?? 10)
            )}
          </p>
          <span className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cream px-6 text-sm font-medium text-plum transition-colors group-hover:bg-cream/90">
            {campaign.buttonText || 'اعرفي التفاصيل'}
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </section>
  )
}
