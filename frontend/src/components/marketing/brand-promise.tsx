'use client'

import { FlaskConical, Sparkles, Gem } from 'lucide-react'
import { useI18n } from '@/lib/i18n/use-i18n'

/** شريط مميزات العلامة — 3 وعود أسفل البانر الرئيسي */
export function BrandPromise() {
  const { t } = useI18n()

  const promises = [
    { Icon: FlaskConical, title: t.marketing.promise.ingredientsTitle, text: t.marketing.promise.ingredientsText },
    { Icon: Sparkles, title: t.marketing.promise.resultsTitle, text: t.marketing.promise.resultsText },
    { Icon: Gem, title: t.marketing.promise.qualityTitle, text: t.marketing.promise.qualityText },
  ]

  return (
    <section className="py-6 md:py-8" aria-label={t.a11y.brandPromise}>
      <div className="container-shelight">
        <div className="grid gap-6 rounded-[var(--radius-xl)] border border-plum/10 bg-white/60 p-6 shadow-soft sm:grid-cols-3 sm:p-8 md:p-10">
          {promises.map(({ Icon, title, text }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-start"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-plum/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-lg font-semibold text-plum">{title}</h3>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}