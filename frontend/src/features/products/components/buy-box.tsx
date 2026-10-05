'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ShieldCheck, Truck, MessageCircle } from 'lucide-react'
import { ProductRating } from '@/components/product/product-rating'
import { PriceDisplay } from '@/components/product/price-display'
import { QuantitySelector } from '@/components/product/quantity-selector'
import { AddToCartButton } from '@/components/product/add-to-cart-button'
import { WishlistButton } from '@/components/product/wishlist-button'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { addToCartAndOpen } from '@/store/cart-store'
import { toast } from 'sonner'
import type { Product, ProductVariant } from '@/types/product'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'
import { useStoreSettings } from '@/features/store-settings/use-store-settings'
import { formatPrice } from '@/lib/utils/format-price'

interface BuyBoxProps {
  product: Product
}

/** صندوق الشراء في صفحة المنتج */
export function BuyBox({ product }: BuyBoxProps) {
  const { t } = useI18n()
  const settings = useStoreSettings()
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants[0]
  )
  const price = selectedVariant?.price ?? product.price
  const compareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice

  const trust = [
    { Icon: Truck, text: t.productPage.freeShipping.replace('{threshold}', formatPrice(settings.freeShippingThreshold)) },
    { Icon: MessageCircle, text: t.productPage.easyReturns },
    { Icon: ShieldCheck, text: t.productPage.dermTested },
  ]

  const INVENTORY_LABELS: Record<Product['inventoryStatus'], string> = {
    'in-stock': t.productPage.shipsIn24h,
    'low-stock': t.productPage.fewLeft,
    'out-of-stock': t.productPage.outOfStock,
    preorder: t.productPage.preOrder,
  }

  const handleBuyNow = () => {
    addToCartAndOpen(product, quantity, selectedVariant?.id)
    toast.success(t.productPage.checkoutToast)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={`/categories/${product.category.slug}`}
          className="text-xs uppercase tracking-[0.15em] text-primary transition-colors hover:text-primary-dark"
        >
          {product.category.name}
        </Link>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-plum md:text-4xl">
          {product.name}
        </h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <ProductRating rating={product.rating} reviewCount={product.reviewCount} size="md" />
          <a href="#reviews" className="text-xs text-muted underline-offset-2 hover:underline">
            {t.productPage.readReviews}
          </a>
        </div>
      </div>

      <PriceDisplay price={price} compareAtPrice={compareAt} size="lg" />

      {/* حالة المخزون */}
      <p aria-live="polite" className={cn('text-sm font-medium', INVENTORY_CLASSES[product.inventoryStatus])}>
        {INVENTORY_LABELS[product.inventoryStatus]}
      </p>

      {/* اختيار المتغيرات */}
      {product.variants.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t.productPage.size}</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={selectedVariant?.id === variant.id}
                onClick={() => setSelectedVariant(variant)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm transition-colors',
                  selectedVariant?.id === variant.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-surface hover:border-primary'
                )}
              >
                {variant.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <Separator />

      {/* كمّية + إجراء */}
      <div className="flex items-center gap-3">
        <QuantitySelector value={quantity} onChange={setQuantity} max={product.stock} />
        <div className="flex-1">
          <AddToCartButton
            product={product}
            quantity={quantity}
            variantId={selectedVariant?.id}
            className="h-12"
          />
        </div>
        <WishlistButton productId={product.id} className="border border-border" />
      </div>
      <Button variant="dark" className="h-12 w-full" disabled={product.inventoryStatus === 'out-of-stock'} onClick={handleBuyNow}>
        {t.productPage.buyItNow}
      </Button>

      {/* الثقة */}
      <ul className="space-y-2 rounded-[var(--radius-lg)] bg-accent/25 p-4 text-sm text-charcoal">
        {trust.map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {text}
          </li>
        ))}
        <li className="flex items-center gap-2.5">
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          {t.productPage.inStock}
        </li>
      </ul>
    </div>
  )
}

const INVENTORY_CLASSES: Record<Product['inventoryStatus'], string> = {
  'in-stock': 'text-success',
  'low-stock': 'text-warning',
  'out-of-stock': 'text-danger',
  preorder: 'text-info',
}