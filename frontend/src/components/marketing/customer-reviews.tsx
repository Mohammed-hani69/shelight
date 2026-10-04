'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { SectionHeading } from '@/components/marketing/section-heading'
import { reviewService } from '@/services/review-service'
import type { ClientReview } from '@/types/reviews'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

/** مراجعات العملاء */
export function CustomerReviews() {
  const { t } = useI18n()
  const [reviews, setReviews] = useState<ClientReview[]>([])

  useEffect(() => {
    let active = true
    reviewService
      .clients()
      .then((result) => {
        if (active) setReviews(result)
      })
      .catch(() => {
        if (active) setReviews([])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="py-14 md:py-20" aria-label={t.a11y.customerReviews}>
      <div className="container-shelight">
        <SectionHeading
          eyebrow={t.marketing.reviewsEyebrow}
          title={t.marketing.reviewsTitle}
          subtitle={t.marketing.reviewsSub}
        />
        <div className="mx-auto mb-8 flex items-center justify-center gap-2">
          <div className="flex" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-warning text-warning" />
            ))}
          </div>
          <span className="text-sm text-muted">{t.marketing.ratingsSummary}</span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((review, i) => (
            <figure
              key={review.id}
              className={cn(
                'flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5',
                i % 2 === 1 && 'lg:mt-6'
              )}
            >
              <div className="flex" aria-label={`Rated ${review.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={cn(
                      'h-3.5 w-3.5',
                      s < Math.round(review.rating)
                        ? 'fill-warning text-warning'
                        : 'text-muted/30'
                    )}
                  />
                ))}
              </div>
              <blockquote>
                <p className="text-sm leading-relaxed text-charcoal">&quot;{review.text}&quot;</p>
              </blockquote>
              <figcaption className="mt-auto flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold text-plum">{review.name}</span>
                {review.product && (
                  <span className="text-xs text-muted">{review.product}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}