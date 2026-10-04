'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { ProductGrid } from '@/components/product/product-grid'
import { EmptyState } from '@/components/common/empty-state'
import { SectionHeading } from '@/components/marketing/section-heading'
import { useWishlistStore } from '@/store/wishlist-store'
import { productService } from '@/features/products/services/product-service'
import type { Product } from '@/types/product'
import { useI18n } from '@/lib/i18n/use-i18n'

/** صفحة قائمة الرغبات */
export function WishlistPage() {
  const ids = useWishlistStore((s) => s.ids)
  const { t } = useI18n()

  // في الوضع الحقيقي تُحفظ المعرّفات فقط، فنجلب تفاصيل كل منتج.
  const products = useProductsByIds(ids)

  return (
    <div className="container-shelight py-10 md:py-14">
      <SectionHeading
        align="start"
        eyebrow={t.wishlistPage.savedForLater}
        title={t.wishlistPage.yourWishlist}
        subtitle={t.wishlistPage.itemsSaved.replace('{count}', String(products.items.length))}
      />

      {products.loading && products.items.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">{t.common.loading}</div>
      ) : products.items.length === 0 ? (
        <EmptyState
          title={t.wishlistPage.empty}
          description={t.wishlistPage.emptySub}
          actionLabel={t.wishlistPage.discover}
          actionHref="/shop"
        />
      ) : (
        <>
          <ProductGrid products={products.items} />
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
            <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
            {t.wishlistPage.note}
          </div>
        </>
      )}
    </div>
  )
}

/** يجلب المنتجات دفعة واحدة، ويتجاهل النتائج بعد إزالة المكوّن. */
function useProductsByIds(ids: string[]): { items: Product[]; loading: boolean } {
  const [state, setState] = useState<{ items: Product[]; loading: boolean }>({
    items: [],
    loading: true,
  })

  useEffect(() => {
    let active = true

    Promise.all(ids.map((id) => productService.getById(id)))
      .then((resolved) => {
        if (!active) return
        setState({
          items: resolved.filter((p): p is Product => Boolean(p)),
          loading: false,
        })
      })
      .catch(() => {
        if (active) setState({ items: [], loading: false })
      })

    return () => {
      active = false
    }
  }, [ids])

  return state
}
