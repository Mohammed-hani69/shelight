'use client'

import Link from 'next/link'
import Image from 'next/image'
import { WishlistButton } from '@/components/product/wishlist-button'
import { ProductRating } from '@/components/product/product-rating'
import { PriceDisplay } from '@/components/product/price-display'
import { DiscountBadge } from '@/components/product/discount-badge'
import { AddToCartButton } from '@/components/product/add-to-cart-button'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/types/product'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

interface ProductCardProps {
  product: Product
  className?: string
  /** إظهار زر السلة فوراً */
  showAddToCart?: boolean
}

/** بطاقة المنتج — تستخدم في كل شبكات المنتجات والكروسلات */
export function ProductCard({ product, className, showAddToCart = true }: ProductCardProps) {
  const isNew = product.isNew
  const isOut = product.inventoryStatus === 'out-of-stock'
  const { t } = useI18n()

  return (
    <article
      className={cn(
        'group relative mx-auto flex h-full w-full max-w-[180px] flex-col overflow-hidden rounded-md border border-border bg-surface transition-shadow hover:shadow-card',
        className
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className="relative mx-2.5 mt-2.5 block aspect-[16/9] overflow-hidden rounded-md bg-cream-dark/50"
        aria-label={product.name}
      >
        {product.images[0] && (
          <Image
            src={product.images[0].url}
            alt={product.images[1]?.alt ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className={cn(
              'object-contain transition-transform duration-500 group-hover:scale-[1.03]',
              isOut && 'opacity-60'
            )}
          />
        )}
        {/* الشارات */}
        <div className="absolute start-2 top-2 flex flex-col gap-1.5">
          {isNew && <Badge variant="success">{t.product.new}</Badge>}
          <DiscountBadge price={product.price} compareAtPrice={product.compareAtPrice} />
        </div>
        <div className="absolute end-2 top-2">
          <WishlistButton productId={product.id} size="sm" className="bg-surface/80 backdrop-blur" />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-2">
        <span className="eyebrow line-clamp-1 text-[10px] text-muted">
          {product.category.name}
        </span>
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-[13px] font-medium leading-snug hover:text-primary-dark"
        >
          {product.name}
        </Link>
        <div className="mt-0.5">
          <ProductRating rating={product.rating} reviewCount={product.reviewCount} />
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
        </div>
        {showAddToCart && !isOut && (
          <AddToCartButton product={product} className="mt-1 h-8 text-[11px]" />
        )}
        {isOut && (
          <p className="mt-1 rounded-full bg-accent/40 px-3 py-1.5 text-center text-xs font-medium text-muted">
            {t.product.outOfStock}
          </p>
        )}
      </div>
    </article>
  )
}