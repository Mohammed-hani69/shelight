'use client'

import type { ComponentType } from 'react'
import { ShoppingBag, Truck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

/** شريط الإعلانات أعلى الصفحة */
export function AnnouncementBar() {
  const { t } = useI18n()
  const [TruckIcon, SparkleIcon, BagIcon] = [Truck, Sparkles, ShoppingBag] as ComponentType<{
    className?: string
  }>[]

  const items = [
    { icon: TruckIcon, text: t.announcement.freeShipping },
    { icon: SparkleIcon, text: t.announcement.formulas },
    { icon: BagIcon, text: t.announcement.returns },
  ]

  return (
    <div className="bg-plum text-cream">
      <div className="container-shelight flex h-9 items-center justify-center gap-8 overflow-hidden">
        {items.map(({ icon: Icon, text }) => (
          <p
            key={text}
            className={cn(
              'hidden items-center gap-1.5 text-xs md:flex'
            )}
          >
            <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {text}
          </p>
        ))}
        <p className="text-xs md:hidden">{t.announcement.freeShipping}</p>
      </div>
    </div>
  )
}