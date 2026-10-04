'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { SectionHeading } from '@/components/marketing/section-heading'
import { ProductRating } from '@/components/product/product-rating'
import { PriceDisplay } from '@/components/product/price-display'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { bundleService } from '@/features/bundles/services/bundle-service'
import { addToCartAndOpen, useCartStore } from '@/store/cart-store'
import { formatPrice } from '@/lib/utils/format-price'
import { useI18n } from '@/lib/i18n/use-i18n'
import type { Bundle } from '@/types/bundle'

/**
 * صفحة الباقات: شراء الروتين كاملاً بخصم.
 *
 * الباقات تأتي من `GET /bundles`، ومع كل باقة `couponCode` يجعل الطلب
 * يساوي سعر الباقة المعلن تماماً — نثبّته في السلة عند الإضافة.
 */
export function BundlesPage() {
  const [adding, setAdding] = useState<string | null>(null)
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()

  useEffect(() => {
    let active = true
    bundleService
      .list()
      .then((data) => {
        if (active) setBundles(data)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleAddBundle = (bundle: Bundle) => {
    if (bundle.items.length === 0) return
    setAdding(bundle.id)
    try {
      // كل عضو بكميته المعلنة في الباقة، لا بكمية ثابتة.
      bundle.items.forEach((item) => addToCartAndOpen(item.product, item.quantity))
      if (bundle.couponCode) {
        useCartStore.getState().setCouponCode(bundle.couponCode)
        toast.success(
          t.bundles.couponToast.replace('{price}', formatPrice(bundle.price))
        )
      } else {
        toast.success(t.bundles.addedToast.replace('{name}', bundle.name))
      }
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="container-shelight py-10 md:py-14">
      <SectionHeading
        eyebrow={t.bundles.saveWithRituals}
        title={t.bundles.title}
        subtitle={t.bundles.subtitle}
      />

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-96 animate-pulse rounded-[var(--radius-xl)] border border-border bg-surface"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <article
              key={bundle.id}
              id={bundle.slug}
              className="flex flex-col scroll-mt-24 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface transition-shadow hover:shadow-card"
            >
              <div className="relative aspect-[4/3]">
                {bundle.image && (
                  <Image
                    src={bundle.image}
                    alt={bundle.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover"
                  />
                )}
                {bundle.badge && (
                  <Badge variant="secondary" className="absolute start-3 top-3">
                    {bundle.badge}
                  </Badge>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <h2 className="font-display text-2xl font-semibold text-plum">{bundle.name}</h2>
                <p className="text-sm leading-relaxed text-muted">{bundle.description}</p>

                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    {t.bundles.itemsCount.replace('{count}', String(bundle.itemCount))}
                  </h3>
                  <div className="flex -space-x-3 rtl:space-x-reverse">
                    {bundle.items.map((item) => (
                      <div
                        key={item.productId}
                        className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-surface"
                        title={item.product.name}
                      >
                        {item.product.images[0] && (
                          <Image
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <ProductRating rating={bundle.rating} reviewCount={bundle.reviewCount} />
                <Separator />
                <div className="mt-auto flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-3">
                    <PriceDisplay
                      price={bundle.price}
                      compareAtPrice={bundle.compareAtPrice}
                      size="lg"
                    />
                    <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                      {t.bundles.saveAmount.replace(
                        '{amount}',
                        formatPrice(bundle.compareAtPrice - bundle.price)
                      )}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleAddBundle(bundle)}
                    disabled={adding === bundle.id || bundle.items.length === 0}
                  >
                    {adding === bundle.id ? t.bundles.adding : t.bundles.addToCart}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
