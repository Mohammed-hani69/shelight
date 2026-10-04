'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui-store'
import { productService } from '@/features/products/services/product-service'
import type { Product } from '@/types/product'
import { formatPrice } from '@/lib/utils/format-price'
import { useI18n } from '@/lib/i18n/use-i18n'

const popularSearchKeys = [
  'serum',
  'cleanser',
  'moisturizer',
  'eyeCream',
  'hairMask',
  'bodyOil',
] as const

type PopularSearchKey = (typeof popularSearchKeys)[number]

/** نافذة البحث مع اقتراحات فورية */
export function SearchDialog() {
  const { t } = useI18n()
  const isOpen = useUIStore((s) => s.searchOpen)
  const setOpen = useUIStore((s) => s.setSearchOpen)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (!value.trim()) setResults([])
  }

  // بحث محلي سريع — عند ربط الـ backend نستبدله بـ API /products/search
  useEffect(() => {
    if (!query.trim()) return
    const timer = window.setTimeout(() => {
      productService
        .list({ search: query, limit: 6 })
        .then(({ items }) => setResults(items))
        .catch(() => setResults([]))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [query])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
  }, [setOpen])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setOpen(true) : handleClose())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.search.title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t.search.placeholder}
            className="ps-9"
            aria-label={t.search.aria}
          />
        </div>

        {query.trim() === '' ? (
          <div>
            <p className="eyebrow mb-2 text-xs font-medium text-muted">
              {t.search.popular}
            </p>
            <div className="flex flex-wrap gap-2">
              {popularSearchKeys.map((key) => {
                const term = t.search.popularItems[key as PopularSearchKey]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="rounded-full border border-border bg-accent/30 px-3 py-1.5 text-sm transition-colors hover:bg-accent/60"
                  >
                    {term}
                  </button>
                )
              })}
            </div>
          </div>
        ) : results.length > 0 ? (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto" role="listbox">
            {results.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/products/${product.slug}`}
                  onClick={handleClose}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent/40"
                >
                  {product.images[0] && (
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted">{product.category.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary-dark">
                    {formatPrice(product.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            {t.search.noResults.replace('{query}', query)}
          </p>
        )}

        {query.trim() !== '' && (
          <Button asChild variant="link" className="self-center" onClick={handleClose}>
            <Link href={`/shop?q=${encodeURIComponent(query)}`}>{t.search.viewAll}</Link>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}