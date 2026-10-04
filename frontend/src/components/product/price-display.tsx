import { discountPercent, formatPrice } from '@/lib/utils/format-price'
import { cn } from '@/lib/utils/cn'

interface PriceDisplayProps {
  price: number
  compareAtPrice?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/** عرض السعر مع السعر القديم ونسبة الخصم */
export function PriceDisplay({ price, compareAtPrice, size = 'md', className }: PriceDisplayProps) {
  const discount = compareAtPrice ? discountPercent(compareAtPrice, price) : 0
  const sizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
  }[size]

  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span
        className={cn('font-semibold text-primary-dark', sizeClass)}
        data-testid="sale-price"
      >
        {formatPrice(price)}
      </span>
      {compareAtPrice && compareAtPrice > price && (
        <>
          <s className="text-sm text-muted">{formatPrice(compareAtPrice)}</s>
          <span className="text-xs font-medium text-danger">-{discount}%</span>
        </>
      )}
    </div>
  )
}