'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Gift, Sparkles } from 'lucide-react'
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

  const rewardPercent = campaign.rewardPercent ?? 10

  return (
    <section className="container py-6 sm:py-10" aria-label="عرض الإحالة">
      <Link
        href="/invite"
        className="group relative grid overflow-hidden rounded-3xl border border-plum/10 bg-plum text-cream shadow-[0_24px_70px_-36px_rgba(47,25,46,0.75)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-36px_rgba(47,25,46,0.85)] md:min-h-[22rem] md:grid-cols-2"
      >
        <div className="relative min-h-56 overflow-hidden bg-gradient-to-br from-primary-dark to-plum md:min-h-[22rem]">
          {campaign.imageUrl ? (
            <MediaImage
              src={campaign.imageUrl}
              alt={campaign.title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full min-h-56 items-center justify-center bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.18),transparent_42%)] md:min-h-[22rem]">
              <Gift className="h-24 w-24 text-cream/70" strokeWidth={1.25} aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-plum/60 via-transparent to-plum/10" />
          <span className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-charcoal/30 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md sm:right-7 sm:top-7 sm:text-sm">
            <Sparkles className="h-4 w-4 text-cream" aria-hidden="true" />
            دعوة حلوة.. ومكافأة ليكي
          </span>
          <span className="absolute bottom-5 left-5 flex h-20 w-20 flex-col items-center justify-center rounded-full border border-white/50 bg-cream text-plum shadow-xl sm:bottom-7 sm:left-7 sm:h-24 sm:w-24">
            <span className="font-display text-2xl font-bold leading-none sm:text-3xl">{rewardPercent}%</span>
            <span className="mt-1 text-[10px] font-semibold sm:text-xs">خصم ليكي</span>
          </span>
        </div>
        <div className="relative flex flex-col items-start justify-center overflow-hidden p-6 sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full border border-cream/10" />
          <div className="pointer-events-none absolute -left-8 -top-12 h-40 w-40 rounded-full border border-cream/10" />
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-cream/90 sm:text-sm">
            <Gift className="h-4 w-4" aria-hidden="true" />
            هدية ليكي ولصاحبتك
          </span>
          <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl lg:text-4xl">
            {campaign.title}
          </h2>
          <p className="mt-4 max-w-lg leading-7 text-cream/75 sm:text-base">
            {campaign.description.replaceAll(
              '{rewardPercent}',
              String(rewardPercent)
            )}
          </p>
          <span className="mt-6 inline-flex h-12 items-center justify-center gap-3 rounded-full bg-cream px-6 text-sm font-bold text-plum shadow-lg transition duration-200 group-hover:gap-4 group-hover:bg-white">
            {campaign.buttonText || 'اعرفي التفاصيل'}
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </section>
  )
}
