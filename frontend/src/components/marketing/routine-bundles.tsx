'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MediaImage } from '@/components/common/media-image'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Button } from '@/components/ui/button'
import { ProductRating } from '@/components/product/product-rating'
import { PriceDisplay } from '@/components/product/price-display'
import { bundleService } from '@/features/bundles/services/bundle-service'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n/use-i18n'
import type { Bundle } from '@/types/bundle'

/** قسم "أكمل روتينك" — الباقات الجاهزة */
export function RoutineBundles() {
  const { t } = useI18n()
  const [bundles, setBundles] = useState<Bundle[]>([])

  useEffect(() => {
    let active = true
    bundleService
      .list()
      .then((data) => {
        if (active) setBundles(data)
      })
      .catch(() => {
        if (active) setBundles([])
      })
    return () => {
      active = false
    }
  }, [])

  if (bundles.length === 0) return null

  return (
    <section className="bg-accent/20 py-14 md:py-20" aria-label={t.a11y.completeRoutine}>
      <div className="container-shelight">
        <SectionHeading
          eyebrow={t.marketing.routineEyebrow}
          title={t.marketing.routineTitle}
          subtitle={t.marketing.routineSub}
          className="[&>h2]:text-2xl [&>h2]:md:text-3xl [&>p]:text-xs [&>p]:md:text-sm"
        />
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <Link
              key={bundle.id}
              href={`/bundles#${bundle.slug}`}
              className="group overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface transition-shadow hover:shadow-card"
            >
              <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[4/3]">
                {bundle.image && (
                  <MediaImage
                    src={bundle.image}
                    alt={bundle.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                {bundle.badge && (
                  <Badge variant="secondary" className="absolute start-3 top-3">
                    {bundle.badge}
                  </Badge>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3 sm:p-5">
                <h3 className="min-h-9 line-clamp-2 break-words font-display text-sm font-semibold leading-snug text-plum sm:min-h-10 sm:text-base lg:text-lg">
                  {bundle.name}
                </h3>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted sm:text-sm">{bundle.description}</p>
                <ProductRating rating={bundle.rating} reviewCount={bundle.reviewCount} />
                <div className="mt-auto flex flex-col gap-3 pt-1 sm:pt-2">
                  <PriceDisplay
                    price={bundle.price}
                    compareAtPrice={bundle.compareAtPrice}
                    size="md"
                    className="flex-wrap gap-x-1.5"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="pointer-events-none w-full group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  >
                    {t.marketing.viewSet}
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="dark" size="lg">
            <Link href="/bundles">{t.marketing.exploreAllBundles}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}