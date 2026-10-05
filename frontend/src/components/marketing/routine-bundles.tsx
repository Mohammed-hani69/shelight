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
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <Link
              key={bundle.id}
              href={`/bundles#${bundle.slug}`}
              className="group overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface transition-shadow hover:shadow-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
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
              <div className="flex flex-col gap-2 p-5">
                <h3 className="font-display text-2xl font-semibold text-plum">{bundle.name}</h3>
                <p className="text-sm text-muted line-clamp-2">{bundle.description}</p>
                <ProductRating rating={bundle.rating} reviewCount={bundle.reviewCount} />
                <div className="mt-2 flex items-center justify-between">
                  <PriceDisplay price={bundle.price} compareAtPrice={bundle.compareAtPrice} size="lg" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="pointer-events-none group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
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