import { Star, StarHalf } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ProductRatingProps {
  rating: number
  reviewCount?: number
  size?: 'sm' | 'md'
  className?: string
}

/** عرض تقييم المنتج بالنجوم (نصف نجمة مدعومة) */
export function ProductRating({ rating, reviewCount, size = 'sm', className }: ProductRatingProps) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className={cn('flex items-center gap-1.5', className)} aria-label={`تم التقييم ${rating} من 5`}>
      <div className="flex" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => {
          const isFull = i < fullStars
          const isHalf = !isFull && hasHalf && i === fullStars
          return isHalf ? (
            <StarHalf key={i} className={cn(sizeClass, 'fill-warning text-warning')} />
          ) : (
            <Star
              key={i}
              className={cn(
                sizeClass,
                isFull ? 'fill-warning text-warning' : 'text-muted/40'
              )}
            />
          )
        })}
      </div>
      {reviewCount !== undefined && (
        <span className="text-xs text-muted">({reviewCount})</span>
      )}
    </div>
  )
}