'use client'

import { AddToCartButton } from '@/components/product/add-to-cart-button'
import { WishlistButton } from '@/components/product/wishlist-button'
import type { Product } from '@/types/product'

interface StickyCartBarProps {
  product: Product
}

/**
 * شريط الشراء الثابت أسفل الموبايل.
 * يجلس فوق الشريط السفلي بدل أن يتداخل معه، بنفس مرجع الارتفاع
 * `--app-bar-height` المتضمّن في منطقة الأمان.
 */
export function StickyCartBar({ product }: StickyCartBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-[var(--app-bar-height)] z-30 border-t border-border bg-surface/95 p-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2.5">
        <AddToCartButton product={product} className="h-11 flex-1" />
        <WishlistButton productId={product.id} className="h-11 w-11 border border-border" />
      </div>
    </div>
  )
}
