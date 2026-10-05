'use client'

import Link from 'next/link'
import { MediaImage } from '@/components/common/media-image'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { QuantitySelector } from '@/components/product/quantity-selector'
import { PriceDisplay } from '@/components/product/price-display'
import { EmptyState } from '@/components/common/empty-state'
import { SectionHeading } from '@/components/marketing/section-heading'
import { ProductCarousel } from '@/components/product/product-carousel'
import { useCartStore } from '@/store/cart-store'
import { productService } from '@/features/products/services/product-service'
import { usePinnedCoupon } from '@/features/coupons/hooks/use-pinned-coupon'
import { formatPrice } from '@/lib/utils/format-price'
import { useI18n } from '@/lib/i18n/use-i18n'
import type { Product } from '@/types/product'

/** صفحة السلة الكاملة */
export function CartPage() {
  const { t } = useI18n()
  const { items, calculations, updateQuantity, removeItem } = useCartStore()
  const [bestsellers, setBestsellers] = useState<Product[]>([])

  // كود الباقة مثبَّت في السلة — نُظهره في الملخص حتى لا يفاجئ العميل
  // بانخفاض الإجمالي عند الدفع.
  const { couponCode, discount } = usePinnedCoupon(calculations.subtotal)

  // الاقتراحات من نفس مصدر الكتالوج — وإلا ظهرت منتجات mock لا يعرفها الخادم.
  useEffect(() => {
    let active = true
    productService
      .bestsellers(10)
      .then((products) => {
        if (active) setBestsellers(products)
      })
      .catch(() => {
        if (active) setBestsellers([])
      })
    return () => {
      active = false
    }
  }, [])

  const suggested = bestsellers
    .filter((p) => !items.some((i) => i.productId === p.id))
    .slice(0, 5)

  if (items.length === 0) {
    return (
      <div className="container-shelight py-16">
        <EmptyState
          title={t.cart.empty}
          description={t.cart.emptySub}
          actionLabel={t.cart.startShopping}
          actionHref="/shop"
        />
      </div>
    )
  }

  return (
    <div className="container-shelight py-10 md:py-14">
      <SectionHeading align="start" eyebrow={t.cart.almostThere} title={t.cart.yourBag} />

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* العناصر */}
        <div>
          <ul className="divide-y divide-border border-b border-border">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: 40 }}
                  className="flex gap-4 py-6"
                >
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border"
                  >
                    {item.image && (
                      <MediaImage src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/products/${item.productSlug}`} className="font-medium hover:text-primary">
                          {item.name}
                        </Link>
                        {item.variantName && <p className="text-xs text-muted">{item.variantName}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={t.cart.removeItem.replace('{name}', item.name)}
                        className="text-muted transition-colors hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantitySelector
                        size="sm"
                        value={item.quantity}
                        max={item.stock}
                        onChange={(q) => updateQuantity(item.id, q)}
                      />
                      <PriceDisplay price={item.price} compareAtPrice={item.compareAtPrice} size="md" />
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <Link href="/shop" className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <ArrowRight className="h-4 w-4 -scale-x-100 rtl:scale-x-100" aria-hidden="true" />
            {t.cart.continueShopping}
          </Link>
        </div>

        {/* الملخص */}
        <aside className="h-fit rounded-[var(--radius-lg)] border border-border bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 font-display text-2xl font-semibold text-plum">{t.cart.orderSummary}</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t.cart.subtotal}</dt>
              <dd className="font-medium">{formatPrice(calculations.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.cart.shipping}</dt>
              <dd className="font-medium">
                {calculations.shipping === 0 ? t.cart.free : formatPrice(calculations.shipping)}
              </dd>
            </div>
            {discount > 0 && couponCode && (
              <div className="flex justify-between text-success">
                <dt>{t.cart.bundlePrice.replace('{code}', couponCode)}</dt>
                <dd className="font-medium">-{formatPrice(discount)}</dd>
              </div>
            )}
          </dl>
          <Separator className="my-4" />
          <div className="mb-5 flex items-center justify-between">
            <span className="font-medium">{t.cart.total}</span>
            <span className="font-display text-2xl font-semibold text-plum">
              {formatPrice(Math.max(0, calculations.total - discount))}
            </span>
          </div>
          <Button asChild className="w-full">
            <Link href="/checkout">
              <ShoppingBag aria-hidden="true" />
              {t.cart.checkout}
            </Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            {t.cart.trustBadges}
          </p>
        </aside>
      </div>

      {suggested.length > 0 && (
        <div className="mt-16">
          <SectionHeading eyebrow={t.cart.donotForget} title={t.cart.completeRitual} align="start" />
          <ProductCarousel products={suggested} />
        </div>
      )}
    </div>
  )
}
