'use client'

import { useEffect, useState } from 'react'
import { Quote, BadgeCheck } from 'lucide-react'
import { SectionHeading } from '@/components/marketing/section-heading'
import { reviewService } from '@/services/review-service'
import type { DoctorReview } from '@/types/reviews'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useI18n } from '@/lib/i18n/use-i18n'

/** مراجعات أطباء الجلدية لبناء الثقة */
export function DoctorReviews() {
  const { t } = useI18n()
  const [reviews, setReviews] = useState<DoctorReview[]>([])

  useEffect(() => {
    let active = true
    reviewService
      .doctors()
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
    <section className="py-14 md:py-20" aria-label={t.a11y.doctorReviews}>
      <div className="container-shelight">
        <SectionHeading
          eyebrow={t.marketing.doctorEyebrow}
          title={t.marketing.doctorTitle}
          subtitle={t.marketing.doctorSub}
        />
        <div className="grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <figure
              key={review.id}
              className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6"
            >
              <Quote className="h-7 w-7 -scale-x-100 text-accent" aria-hidden="true" />
              <blockquote className="flex-1">
                <p className="text-sm leading-relaxed text-charcoal">&quot;{review.quote}&quot;</p>
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-border pt-4">
                <Avatar className="bg-accent">
                  <AvatarFallback>{initials(review.doctorName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-plum">
                    {review.doctorName}
                    <BadgeCheck className="h-4 w-4 text-success" aria-label={t.marketing.verifiedDoctor} />
                  </p>
                  <p className="text-xs text-muted">{review.specialty}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
}