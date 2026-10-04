'use client'

import { useEffect, useState } from 'react'
import { Star, ThumbsUp, BadgeCheck } from 'lucide-react'
import { SectionHeading } from '@/components/marketing/section-heading'
import { reviewService } from '@/services/review-service'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'
import type { Review } from '@/types/reviews'
import type { Product } from '@/types/product'
import { useI18n } from '@/lib/i18n/use-i18n'

interface ReviewsSectionProps {
  productId: string
  productName: string
  product?: Product
}

/** مراجعات المنتج مع ملخص التقييم */
export function ReviewsSection({ productId, product }: ReviewsSectionProps) {
  const { t } = useI18n()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [helpfulIds, setHelpfulIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const list = await reviewService.byProduct(productId, product)
      if (!cancelled) {
        setReviews(list)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [productId, product])

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const handleHelpful = (review: Review) => {
    if (helpfulIds.includes(review.id)) return
    setHelpfulIds((ids) => [...ids, review.id])
    void reviewService.markHelpful(review.id)
  }

  return (
    <section id="reviews" className="scroll-mt-24 py-10" aria-label={t.a11y.productReviews}>
      <SectionHeading align="start" eyebrow={t.reviews.eyebrows} title={t.reviews.title} />
      {loading ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          {t.reviews.loading}
        </p>
      ) : reviews.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          {t.reviews.empty}
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* ملخص */}
          <div className="flex h-fit flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center">
            <p className="font-display text-5xl font-semibold text-plum">{average.toFixed(1)}</p>
            <div className="flex" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-4 w-4',
                    i < Math.round(average) ? 'fill-warning text-warning' : 'text-muted/30'
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted">{t.reviews.basedOn.replace('{count}', String(reviews.length))}</p>
          </div>

          {/* القائمة */}
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-[var(--radius-lg)] border border-border bg-surface p-5"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{initials(review.author)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-plum">
                        {review.author}
                        {review.verified && (
                          <BadgeCheck className="h-4 w-4 text-success" aria-label={t.reviews.verifiedBuyer} />
                        )}
                      </p>
                      <div className="flex" aria-label={t.a11y.ratedOutOf5.replace('{rating}', String(review.rating))}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-3 w-3',
                              i < review.rating ? 'fill-warning text-warning' : 'text-muted/30'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted">{formatDate(review.date)}</span>
                </div>
                <h4 className="mb-1 text-sm font-semibold text-charcoal">{review.title}</h4>
                <p className="text-sm leading-relaxed text-muted">{review.body}</p>
                <button
                  type="button"
                  onClick={() => handleHelpful(review)}
                  aria-pressed={helpfulIds.includes(review.id)}
                  className={cn(
                    'mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                    helpfulIds.includes(review.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted hover:border-primary hover:text-primary'
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.reviews.helpful.replace(
                    '{count}',
                    String(review.helpful + (helpfulIds.includes(review.id) ? 1 : 0))
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}