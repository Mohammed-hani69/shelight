'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  max?: number
  min?: number
  className?: string
  size?: 'sm' | 'md'
}

/** محدد الكمية: نظام واضح مع فحص الحدود */
export function QuantitySelector({
  value,
  onChange,
  max = 99,
  min = 1,
  className,
  size = 'md',
}: QuantitySelectorProps) {
  const sizeClass = size === 'sm' ? 'h-8 w-7' : 'h-10 w-9'
  const { t } = useI18n()
  const handleChange = (next: number) => {
    if (next < min || next > max) return
    onChange(next)
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-surface',
        className
      )}
    >
      <button
        type="button"
        onClick={() => handleChange(value - 1)}
        disabled={value <= min}
        aria-label={t.a11y.decreaseQty}
        className={cn(
          sizeClass,
          'flex items-center justify-center rounded-full text-charcoal transition-colors hover:text-primary disabled:opacity-40'
        )}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        className="min-w-8 text-center text-sm font-medium tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => handleChange(value + 1)}
        disabled={value >= max}
        aria-label={t.a11y.increaseQty}
        className={cn(
          sizeClass,
          'flex items-center justify-center rounded-full text-charcoal transition-colors hover:text-primary disabled:opacity-40'
        )}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}