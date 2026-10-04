import { ProductCard } from '@/components/product/product-card'
import { ProductCardSkeleton } from '@/components/product/product-card-skeleton'
import type { Product } from '@/types/product'

interface ProductGridProps {
  products: Product[]
  isLoading?: boolean
  skeletonCount?: number
  className?: string
}

/** شبكة منتجات متجاوبة: 2 عمود موبايل → 4 ديسكتوب */
export function ProductGrid({
  products,
  isLoading = false,
  skeletonCount = 8,
  className,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div
        className={cnGrid(className)}
        aria-busy="true"
        aria-label="جارٍ تحميل المنتجات"
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={cnGrid(className)} role="list" aria-label="المنتجات">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

function cnGrid(className?: string) {
  return [
    'grid grid-cols-2 gap-3 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-5',
    className,
  ].join(' ')
}