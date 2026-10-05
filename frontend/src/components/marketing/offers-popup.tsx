'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BadgePercent, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88svh] max-w-3xl overflow-y-auto p-0">
        <div className="border-b border-border bg-accent/20 px-5 py-6 text-center sm:px-8">
          <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl text-plum sm:text-2xl">{section.title}</DialogTitle>
            <DialogDescription>{section.description}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          {section.products.map((product) => {
            const compareAtPrice = product.compareAtPrice ?? product.price
            const discount = discountPercent(compareAtPrice, product.price)
            return (
              <article key={product.id} className="overflow-hidden rounded-md border border-border bg-surface">
                <Link href={`/products/${product.slug}`} onClick={() => setOpen(false)} className="block">
                  <div className="relative aspect-[4/3] bg-background">
                    {product.images[0]?.url && (
                      <MediaImage
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        fill
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                        className="object-contain p-3"
                      />
                    )}
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-danger px-2 py-1 text-xs font-semibold text-white">
                      <BadgePercent className="h-3.5 w-3.5" aria-hidden="true" />
                      خصم {discount}%
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-charcoal">{product.name}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-semibold text-primary-dark">{formatPrice(product.price)}</span>
                      <s className="text-xs text-muted">{formatPrice(compareAtPrice)}</s>
                    </div>
                  </div>
                </Link>
              </article>
            )
          })}
        </div>

        <div className="flex justify-center border-t border-border px-5 py-4">
          <Button asChild variant="outline" onClick={() => setOpen(false)}>
            <Link href="/shop">تسوّقي كل المنتجات</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
