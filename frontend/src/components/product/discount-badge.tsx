import { Badge, type BadgeProps } from '@/components/ui/badge'
import { discountPercent } from '@/lib/utils/format-price'

interface DiscountBadgeProps {
  price: number
  compareAtPrice?: number
  variant?: BadgeProps['variant']
}

/** شارة نسبة الخصم */
export function DiscountBadge({ price, compareAtPrice, variant = 'sale' }: DiscountBadgeProps) {
  if (!compareAtPrice || compareAtPrice <= price) return null
  return <Badge variant={variant}>-{discountPercent(compareAtPrice, price)}%</Badge>
}