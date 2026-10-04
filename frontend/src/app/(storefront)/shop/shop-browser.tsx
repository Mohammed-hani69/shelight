'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { productService } from '@/features/products/services/product-service'
import { ProductGrid } from '@/components/product/product-grid'
import { FilterPanel, FilterDrawer, type FilterValues } from '@/features/products/components/product-filters'
import { SortDropdown, type SortValue } from '@/features/products/components/sort-dropdown'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import type { Category, Product } from '@/types/product'
import { config } from '@/config/site'
import { useI18n } from '@/lib/i18n/use-i18n'

interface ShopBrowserProps {
  categories: Category[]
  initialProducts: Product[]
  initialTotal: number
  initialCategory?: string
  initialQuery?: string
  initialSort?: SortValue
}

const PAGE_SIZE = config.pagination.defaultPageSize

/** مستعرض المتجر — إدارة فلاتر/فرز/ترقيم عبر الـ URL */
export function ShopBrowser({
  categories,
  initialProducts,
  initialTotal,
  initialCategory,
  initialQuery,
  initialSort = 'popularity',
}: ShopBrowserProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<FilterValues>({
    categories: initialCategory ? [initialCategory] : [],
    tags: [],
  })
  const [sort, setSort] = useState<SortValue>(initialSort)
  const [query] = useState(initialQuery)

  // الخدمة قد تكون غير متزامنة (Flask) أو متزامنة (mock)؛ نوحّدها في حالة واحدة
  const [listing, setListing] = useState<{ products: Product[]; total: number }>({
    products: initialProducts,
    total: initialTotal,
  })

  useEffect(() => {
    let active = true

    productService
      .list({
        categorySlug: filters.categories[0] ?? undefined,
        tags: filters.tags,
        search: query,
        sort,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      .then((result) => {
        if (!active) return
        setListing({ products: result.items, total: result.total })
      })
      .catch(() => {
        if (active) setListing({ products: [], total: 0 })
      })

    return () => {
      active = false
    }
  }, [filters, sort, query, page])

  const shownProducts = listing.products.length > 0 ? listing.products : initialProducts
  const shownTotal = listing.total > 0 ? listing.total : initialTotal

  // مزامنة الفلاتر مع الـ URL فقط (بدون تغيير حالة React)
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (filters.categories[0]) params.set('category', filters.categories[0])
    else params.delete('category')
    if (filters.tags.length) params.set('tags', filters.tags.join(','))
    else params.delete('tags')
    if (sort !== 'popularity') params.set('sort', sort)
    else params.delete('sort')
    if (query) params.set('q', query)
    else params.delete('q')
    router.replace(`/shop?${params.toString()}`, { scroll: false })
  }, [filters, sort, query, router, searchParams])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(shownTotal / PAGE_SIZE)), [shownTotal])

  const handleFilters = (next: FilterValues) => {
    setFilters(next)
    setPage(1)
  }

  const handleSort = (next: SortValue) => {
    setSort(next)
    setPage(1)
  }

  return (
    <div className="container-shelight">
      <div className="flex items-center justify-between gap-3 py-4">
        <p className="text-sm text-muted" aria-live="polite">
          {t.shop.products.replace('{count}', String(shownTotal))}
        </p>
        <div className="flex items-center gap-2">
          <FilterDrawer categories={categories} values={filters} onChange={handleFilters} />
          <SortDropdown value={sort} onChange={handleSort} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* سايدبار الفلاتر (ديسكتوب) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h2 className="mb-4 font-display text-xl font-semibold text-plum">{t.shop.filters}</h2>
            <FilterPanel categories={categories} values={filters} onChange={handleFilters} />
          </div>
        </aside>

        {/* الشبكة */}
        <div>
          {shownProducts.length > 0 ? (
            <>
              <ProductGrid products={shownProducts} />
              <div className="mt-10 flex justify-center">
                <Pagination current={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          ) : (
            <EmptyState
              title={t.shop.noProducts}
              description={t.shop.noProductsSub}
              actionLabel={t.shop.clearFilters}
              onAction={() => handleFilters({ categories: [], tags: [] })}
            />
          )}
        </div>
      </div>
    </div>
  )
}