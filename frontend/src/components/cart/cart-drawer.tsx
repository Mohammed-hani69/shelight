'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MediaImage } from '@/components/common/media-image'
import { motion, AnimatePresence } from 'motion/react'
import { ShoppingBag, Trash2, Sparkles } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { QuantitySelector } from '@/components/product/quantity-selector'
import { PriceDisplay } from '@/components/product/price-display'
import { useCartStore } from '@/store/cart-store'
import { productService } from '@/features/products/services/product-service'
import { usePinnedCoupon } from '@/features/coupons/hooks/use-pinned-coupon'
import { formatPrice } from '@/lib/utils/format-price'
import { calcCartCalculations } from '@/features/cart/utils/cart-utils'
import { useStoreSettings } from '@/features/store-settings/use-store-settings'
import { useI18n } from '@/lib/i18n/use-i18n'
import type { Product } from '@/types/product'

/** سلة التسوق المنزلقة مع شريط الشحن المجاني والمنتجات المقترحة */
export function CartDrawer() {
  const { t } = useI18n()
  const settings = useStoreSettings()
  const { isOpen, close, items, calculations, updateQuantity, removeItem } = useCartStore()
  const displayCalculations = calcCartCalculations(
    items,
    settings.freeShippingThreshold,
    settings.defaultShippingFee,
  )
  const [suggested, setSuggested] = useState<Product | null>(null)
  const { couponCode, discount } = usePinnedCoupon(calculations.subtotal)

  // الاقتراح يأتي من نفس مصدر الكتالوج (API في الوضع الحقيقي) حتى لا
  // يظهر منتج mock بمعرّف لا يعرفه الخادم عند الإضافة من السلة.
  useEffect(() => {
    if (!isOpen || suggested) return
    let active = true
    productService
      .bestsellers(1)
      .then((products) => {
        if (active) setSuggested(products[0] ?? null)
      })
      .catch(() => {
        if (active) setSuggested(null)
      })
    return () => {
      active = false
    }
  }, [isOpen, suggested])

  const progress = settings.freeShippingThreshold > 0
    ? Math.min(100, (calculations.subtotal / settings.freeShippingThreshold) * 100)
    : 100
  const freeShippingText = t.cart.freeShippingProgress.split('{amount}')

  const suggestion = suggested && !items.some((i) => i.productId === suggested.id) ? suggested : null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col p-0">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
            {t.cart.yourBag}
            <span className="text-sm font-normal text-muted">
              {t.cart.bagItems.replace('{count}', String(items.length))}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* شريط الشحن المجاني */}
          <div className="rounded-xl bg-accent/30 p-3">
            <p className="mb-2 text-sm">
              {displayCalculations.remainingForFreeShipping > 0 ? (
                <>
                  {freeShippingText[0]}
                  <strong className="text-primary-dark">
                    {formatPrice(displayCalculations.remainingForFreeShipping)}
                  </strong>
                  {freeShippingText[1]}
                </>
              ) : (
                <strong className="text-success">{t.cart.freeShippingUnlocked}</strong>
              )}
            </p>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-accent"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="mb-4 h-12 w-12 text-muted/40" aria-hidden="true" />
              <p className="font-display text-xl text-plum">{t.cart.empty}</p>
              <p className="mt-1 text-sm text-muted">{t.cart.emptySub}</p>
              <Button asChild variant="outline" className="mt-5" onClick={close}>
                <Link href="/shop">{t.cart.startShopping}</Link>
              </Button>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-3 py-4"
                    >
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border"
                        onClick={close}
                      >
                        {item.image && (
                          <MediaImage src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                        )}
                      </Link>
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between gap-2">
                          <Link
                            href={`/products/${item.productSlug}`}
                            onClick={close}
                            className="font-medium leading-snug hover:text-primary"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label={t.cart.removeItem.replace('{name}', item.name)}
                            className="shrink-0 text-muted transition-colors hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {item.variantName && (
                          <span className="text-xs text-muted">{item.variantName}</span>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <QuantitySelector
                            size="sm"
                            value={item.quantity}
                            max={item.stock}
                            onChange={(q) => updateQuantity(item.id, q)}
                          />
                          <PriceDisplay price={item.price} compareAtPrice={item.compareAtPrice} size="sm" />
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {/* Upsell */}
              {suggestion && (
                <div className="mt-4 rounded-xl border border-border bg-surface p-3">
                  <p className="eyebrow mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.cart.youMayAlsoLike}
                  </p>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/products/${suggestion.slug}`}
                      onClick={close}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md"
                    >
                      {suggestion.images[0] && (
                        <MediaImage
                          src={suggestion.images[0].url}
                          alt={suggestion.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      )}
                    </Link>
                    <div className="flex-1">
                      <Link href={`/products/${suggestion.slug}`} onClick={close} className="text-sm font-medium leading-snug hover:text-primary">
                        {suggestion.name}
                      </Link>
                      <PriceDisplay price={suggestion.price} compareAtPrice={suggestion.compareAtPrice} size="sm" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="border-t border-border p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">{t.cart.subtotal}</span>
                <span className="font-medium">{formatPrice(calculations.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{t.cart.shipping}</span>
                <span className="font-medium">
                  {displayCalculations.shipping === 0 ? t.cart.free : formatPrice(displayCalculations.shipping)}
                </span>
              </div>
              {discount > 0 && couponCode && (
                <div className="flex justify-between text-success">
                  <span>{t.cart.bundlePrice.replace('{code}', couponCode)}</span>
                  <span className="font-medium">-{formatPrice(discount)}</span>
                </div>
              )}
            </div>
            <Separator className="my-2" />
            <div className="mb-4 flex justify-between text-base">
              <span className="font-medium">{t.cart.total}</span>
              <span className="font-display text-xl font-semibold text-plum">
                {formatPrice(Math.max(0, displayCalculations.total - discount))}
              </span>
            </div>
            <Button asChild className="w-full" onClick={close}>
              <Link href="/checkout">{t.cart.checkout}</Link>
            </Button>
            <Button asChild variant="link" className="w-full" onClick={close}>
              <Link href="/cart">{t.cart.viewFullCart}</Link>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}