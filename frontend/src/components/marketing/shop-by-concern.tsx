'use client'

import Link from 'next/link'
import { Droplets, Sparkles, Leaf, Flower, ShieldCheck } from 'lucide-react'
import { SectionHeading } from '@/components/marketing/section-heading'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

type ConcernTag = 'hydration' | 'glow' | 'serum' | 'keratin' | 'sensitive' | 'body'
type ConcernKey = 'hydration' | 'brightening' | 'blemish' | 'hairRepair' | 'sensitive' | 'dailyGlow'

/**
 * "تسوّق حسب الاهتمام" — يقود لبحث المنتجات.
 *
 * الرابط فلترة حقيقية في `/shop?tags=` وليس منتجاً مأخوذاً من mock،
 * حتى لا يقود المستخدم إلى منتج غير موجود في الوضع الحقيقي.
 */
export function ShopByConcern() {
  const { t } = useI18n()

  const concerns: { labelKey: ConcernKey; tag: ConcernTag; Icon: typeof Droplets }[] = [
    { labelKey: 'hydration', tag: 'hydration', Icon: Droplets },
    { labelKey: 'brightening', tag: 'glow', Icon: Sparkles },
    { labelKey: 'blemish', tag: 'serum', Icon: Leaf },
    { labelKey: 'hairRepair', tag: 'keratin', Icon: Flower },
    { labelKey: 'sensitive', tag: 'sensitive', Icon: ShieldCheck },
    { labelKey: 'dailyGlow', tag: 'body', Icon: Sparkles },
  ]

  return (
    <section className="py-14 md:py-20" aria-label={t.a11y.shopByConcern}>
      <div className="container-shelight">
        <SectionHeading
          eyebrow={t.marketing.concernEyebrow}
          title={t.marketing.concernTitle}
          subtitle={t.marketing.concernSub}
        />
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {concerns.map(({ labelKey, tag, Icon }) => (
            <Link
              key={labelKey}
              href={`/shop?tags=${tag}`}
              className={cn(
                'group flex aspect-square flex-col items-center justify-center gap-2.5 rounded-[var(--radius-lg)]',
                'border border-border bg-surface text-center transition-all hover:border-primary hover:bg-accent/30'
              )}
            >
              <Icon
                className="h-6 w-6 text-primary transition-transform group-hover:scale-110"
                aria-hidden="true"
              />
              <span className="px-2 text-sm font-medium text-charcoal">
                {t.marketing.concerns[labelKey]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
