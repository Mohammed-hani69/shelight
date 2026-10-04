'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { SectionHeading } from '@/components/marketing/section-heading'
import { useI18n } from '@/lib/i18n/use-i18n'

const BEFORE_IMAGE =
  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1000&h=625&q=70'
const AFTER_IMAGE =
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&h=625&q=70'

/** معرض "قبل / بعد" يُدار بزر تحكم مقسّم */
export function BeforeAfterResults() {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    setPosition(clampResult(x))
  }

  return (
    <section className="bg-accent/20 py-14 md:py-20" aria-label={t.a11y.beforeAfter}>
      <div className="container-shelight">
        <SectionHeading
          eyebrow={t.marketing.beforeAfterEyebrow}
          title={t.marketing.beforeAfterTitle}
          subtitle={t.marketing.beforeAfterSub}
        />
        <figure className="mx-auto max-w-3xl overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface">
          <div
            ref={containerRef}
            className="relative aspect-[16/10] select-none overflow-hidden"
            onPointerMove={handlePointerMove}
            style={{ touchAction: 'pan-y' }}
          >
            {/* After (الخلفية) */}
            <Image
              src={AFTER_IMAGE}
              alt={t.a11y.skinAfterAlt}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
            {/* Before (مغطاة جزئياً) */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: `inset(0 ${100 - position}% 0 0)`,
              }}
            >
              <Image
                src={BEFORE_IMAGE}
                alt={t.a11y.skinBeforeAlt}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            </div>
            {/* تسميات */}
            <span className="absolute bottom-3 start-3 rounded-full bg-plum/70 px-3 py-1 text-xs font-medium text-cream backdrop-blur">
              {t.marketing.before}
            </span>
            <span className="absolute bottom-3 end-3 rounded-full bg-primary/80 px-3 py-1 text-xs font-medium text-cream backdrop-blur">
              {t.marketing.after}
            </span>
            {/* المقبض */}
            <div
              className="pointer-events-none absolute inset-y-0 z-10 flex items-center"
              style={{ insetInlineStart: `${position}%` }}
            >
              <div className="h-full w-0.5 bg-cream shadow-sm" />
              <span className="absolute start-0 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-cream text-xs font-bold text-plum shadow-card">
                {'< >'}
              </span>
            </div>
          </div>
          <figcaption className="p-3 text-center text-xs text-muted">
            {t.marketing.beforeAfterNote}
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function clampResult(value: number): number {
  return Math.max(5, Math.min(95, value))
}