'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BadgePercent, ChevronLeft, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MediaImage } from '@/components/common/media-image'
import { marketingSectionsService, type PublicOfferPopup } from '@/features/marketing-sections/marketing-sections-service'
import { discountPercent, formatPrice } from '@/lib/utils/format-price'

const SEEN_KEY = 'shelight-offers-popup-seen'

export function OffersPopup() {
  const [section, setSection] = useState<PublicOfferPopup | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return
    } catch {
      // The popup can still be shown when session storage is unavailable.
    }

    let cancelled = false
    let openTimer: number | undefined
    marketingSectionsService.getOfferPopup().then((data) => {
      if (cancelled || !data?.isActive || data.products.length === 0) return
      setSection(data)
      openTimer = window.setTimeout(() => {
        if (cancelled) return
        setOpen(true)
        try {
          window.sessionStorage.setItem(SEEN_KEY, 'true')
        } catch {
          // Keep the open state even if storage is unavailable.
        }
      }, 1450)
    }).catch(() => {})

    return () => {
      cancelled = true
      if (openTimer) window.clearTimeout(openTimer)
    }
  }, [])

  if (!section) return null

  if (!open) return null

  return (
    <aside
      aria-label="عروض المنتجات"
      className="fixed bottom-[calc(var(--app-bar-height)+1rem)] left-3 z-40 w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-card sm:bottom-5 sm:left-5"
    >
      <div className="flex items-start gap-3 border-b border-border bg-accent/20 px-3 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-plum">{section.title}</h2>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{section.description}</p>
        </div>
        <button
          type="button"
          aria-label="إغلاق العروض"
          onClick={() => setOpen(false)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-plum"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="max-h-56 divide-y divide-border overflow-y-auto px-3">
        {section.products.slice(0, 2).map((product) => {
          const compareAtPrice = product.compareAtPrice ?? product.price
          const discount = discountPercent(compareAtPrice, product.price)
          return (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 py-3"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-background">
                {product.images[0]?.url && (
                  <MediaImage
                    src={product.images[0].url}
                    alt={product.images[0].alt || product.name}
                    fill
                    sizes="56px"
                    className="object-contain p-1"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-charcoal">{product.name}</span>
                <span className="mt-1 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-primary-dark">{formatPrice(product.price)}</span>
                  <s className="text-muted">{formatPrice(compareAtPrice)}</s>
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-danger">
                <BadgePercent className="inline h-3.5 w-3.5" aria-hidden="true" /> {discount}%
              </span>
            </Link>
          )
        })}
      </div>

      <div className="border-t border-border px-3 py-2">
        <Button asChild variant="link" size="sm" className="h-8 w-full justify-between px-1">
          <Link href="/shop" onClick={() => setOpen(false)}>
            تسوّقي كل العروض
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </aside>
  )
}
