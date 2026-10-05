'use client'

import { FlaskConical, Leaf, ShieldCheck, Truck, Sparkles, HeartPulse } from 'lucide-react'
import { SectionHeading } from '@/components/marketing/section-heading'
import { MobileCarousel } from '@/components/marketing/mobile-carousel'
import { useI18n } from '@/lib/i18n/use-i18n'

export function WhyChoose() {
  const { t } = useI18n()

  const reasons = [
    { Icon: FlaskConical, title: t.marketing.reasons.clinicalTitle, text: t.marketing.reasons.clinicalText },
    { Icon: HeartPulse, title: t.marketing.reasons.dermTitle, text: t.marketing.reasons.dermText },
    { Icon: Leaf, title: t.marketing.reasons.cleanTitle, text: t.marketing.reasons.cleanText },
    { Icon: ShieldCheck, title: t.marketing.reasons.safetyTitle, text: t.marketing.reasons.safetyText },
    { Icon: Truck, title: t.marketing.reasons.deliveryTitle, text: t.marketing.reasons.deliveryText },
    { Icon: Sparkles, title: t.marketing.reasons.resultsTitle, text: t.marketing.reasons.resultsText },
  ]

  return (
    <section className="bg-plum py-14 text-cream md:py-20" aria-label={t.a11y.whyChoose}>
      <div className="container-shelight">
        <SectionHeading
          eyebrow={t.marketing.whyEyebrow}
          title={t.marketing.whyTitle}
          subtitle={t.marketing.whySub}
          tone="dark"
        />
        <MobileCarousel
          label={t.marketing.whyTitle}
          desktopClassName="md:grid-cols-2 lg:grid-cols-3"
          dark
        >
          {reasons.map(({ Icon, title, text }) => (
            <div key={title} className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream/10 text-accent">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="max-w-xs text-sm text-cream/75">{text}</p>
            </div>
          ))}
        </MobileCarousel>
      </div>
    </section>
  )
}