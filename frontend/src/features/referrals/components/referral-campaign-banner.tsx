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
    <section className="container flex justify-center py-3 sm:py-8" aria-label="عرض الإحالة">
      <Link
        href="/invite"
        className="group relative mx-auto grid w-full max-w-[20rem] overflow-hidden rounded-2xl border border-plum/10 bg-plum text-cream shadow-[0_20px_55px_-36px_rgba(47,25,46,0.75)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_65px_-36px_rgba(47,25,46,0.85)] md:max-w-none md:grid-cols-2 md:rounded-3xl md:min-h-[20rem]"
      >
        <div className="relative min-h-32 overflow-hidden bg-gradient-to-br from-primary-dark to-plum md:min-h-[20rem]">
          {campaign.imageUrl ? (
            <MediaImage
              src={campaign.imageUrl}
              alt={campaign.title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full min-h-32 items-center justify-center bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.18),transparent_42%)] md:min-h-[20rem]">
              <Gift className="h-16 w-16 text-cream/70 md:h-20 md:w-20" strokeWidth={1.25} aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-plum/60 via-transparent to-plum/10" />
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/25 bg-charcoal/30 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg backdrop-blur-md sm:right-5 sm:top-5 sm:text-xs md:px-4 md:py-2">
            <Sparkles className="h-3 w-3 text-cream" aria-hidden="true" />
            دعوة حلوة.. ومكافأة ليكي
          </span>
          <span className="absolute bottom-2.5 left-2.5 flex h-14 w-14 flex-col items-center justify-center rounded-full border border-white/50 bg-cream text-plum shadow-xl sm:bottom-5 sm:left-5 sm:h-20 sm:w-20">
            <span className="font-display text-lg font-bold leading-none sm:text-2xl">{rewardPercent}%</span>
            <span className="mt-1 text-[8px] font-semibold sm:text-[10px]">خصم ليكي</span>
          </span>
        </div>
        <div className="relative flex flex-col items-start justify-center overflow-hidden p-3 sm:p-6 md:p-8 lg:p-10">
          <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full border border-cream/10" />
          <div className="pointer-events-none absolute -left-8 -top-12 h-32 w-32 rounded-full border border-cream/10" />
          <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-cream/20 bg-cream/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-cream/90 sm:mb-3 sm:gap-1.5 sm:px-3 sm:text-xs">
            <Gift className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            هدية ليكي ولصاحبتك
          </span>
          <h2 className="font-display text-lg font-semibold leading-tight sm:text-2xl lg:text-3xl">
            {campaign.title}
          </h2>
          <p className="mt-2 max-w-lg text-xs leading-5 text-cream/75 sm:mt-3 sm:text-sm sm:leading-6 md:text-base">
            {campaign.description.replaceAll(
              '{rewardPercent}',
              String(rewardPercent)
            )}
          </p>
          <span className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-cream px-4 text-[11px] font-bold text-plum shadow-lg transition duration-200 group-hover:gap-3 group-hover:bg-white sm:mt-4 sm:h-10 sm:px-5 sm:text-sm">
            {campaign.buttonText || 'اعرفي التفاصيل'}
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </section>
  )
}
