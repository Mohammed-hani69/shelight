'use client'

import { useEffect, useState } from 'react'
import { Star, ThumbsUp, BadgeCheck, Loader2, Send } from 'lucide-react'
import { SectionHeading } from '@/components/marketing/section-heading'
import { reviewService } from '@/services/review-service'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { friendlyMessage } from '@/lib/api/errors'
import type { Review } from '@/types/reviews'
import type { Product } from '@/types/product'
import { useI18n } from '@/lib/i18n/use-i18n'

interface ReviewsSectionProps {
  productId: string
  productName: string
  product?: Product
}

/** مراجعات المنتج مع ملخص التقييم */
export function ReviewsSection({ productId, product, productName }: ReviewsSectionProps) {
  const { t } = useI18n()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [helpfulIds, setHelpfulIds] = useState<string[]>([])
  const [author, setAuthor] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)

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

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!product || !author.trim() || body.trim().length < 2) {
      toast.error('اكتبي اسمك وتعليقًا قصيرًا عن تجربتك.')
      return
    }
    setSubmitting(true)
    try {
      const created = await reviewService.submit(product, {
        productId,
        author: author.trim(),
        rating,
        title: title.trim(),
        body: body.trim(),
        verified: false,
      })
      setReviews((current) => [created, ...current])
      setTitle('')
      setBody('')
      toast.success('شكرًا لمشاركة تقييمك')
    } catch (error) {
      toast.error(friendlyMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="reviews" className="scroll-mt-24 py-10" aria-label={t.a11y.productReviews}>
      <SectionHeading align="start" eyebrow={t.reviews.eyebrows} title={t.reviews.title} />
      <form onSubmit={submitReview} className="mb-8 space-y-4 rounded-lg border border-border bg-surface p-5 sm:p-6">
        <div>
          <h3 className="font-display text-lg font-semibold text-plum">قيّمي {productName}</h3>
          <p className="mt-1 text-sm text-muted">شاركي تجربتك لمساعدة عميلات أخريات.</p>
        </div>
        <div className="space-y-2">
          <Label>تقييمك بالنجوم</Label>
          <div className="flex gap-1" role="radiogroup" aria-label="اختاري التقييم من نجمة إلى خمس نجوم" dir="ltr">
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} نجوم`}
                  onClick={() => setRating(value)}
                  className="rounded-sm p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Star className={cn('h-6 w-6', value <= rating ? 'fill-warning text-warning' : 'text-muted/35')} />
                </button>
              )
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="review-author">اسمك</Label>
            <Input id="review-author" value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-title">عنوان مختصر (اختياري)</Label>
            <Input id="review-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review-body">تعليقك</Label>
          <Textarea id="review-body" value={body} onChange={(event) => setBody(event.target.value)} minLength={2} maxLength={2000} rows={4} required />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          إرسال التقييم
        </Button>
      </form>
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