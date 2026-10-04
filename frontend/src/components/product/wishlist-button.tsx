'use client'

import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlist-store'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n/use-i18n'

interface WishlistButtonProps {
  productId: string
  className?: string
  size?: 'sm' | 'md'
}

export function WishlistButton({ productId, className, size = 'md' }: WishlistButtonProps) {
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(productId))
  const toggle = useWishlistStore((s) => s.toggle)
  const { t } = useI18n()
  const sizeClass = size === 'sm' ? 'h-8 w-8 [&_svg]:size-4' : 'h-10 w-10'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isWishlisted ? t.wishlist.remove : t.wishlist.add}
          aria-pressed={isWishlisted}
          className={cn(sizeClass, className)}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggle(productId)
          }}
        >
          <Heart
            className={cn(
              'transition-colors',
              isWishlisted ? 'fill-danger text-danger' : 'text-charcoal'
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isWishlisted ? t.wishlist.remove : t.wishlist.add}
      </TooltipContent>
    </Tooltip>
  )
}