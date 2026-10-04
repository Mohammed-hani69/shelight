import type { Metadata } from 'next'
import { ShopBrowser } from './shop-browser'
import { productService } from '@/features/products/services/product-service'
import { productRepository } from '@/services/catalog-service'
import { config } from '@/config/site'
import type { SortValue } from '@/features/products/components/sort-dropdown'
import type { Product } from '@/types/product'

export const metadata: Metadata = {
  title: 'تسوّقي كل المنتجات',
  description:
    'تصفحي مجموعة شيلايت الكاملة — العناية بالبشرة والشعر والعين والأظافر والأطفال. مستحضرات جلدية فاخرة لكل طقس.',
}

interface ShopPageProps {
  searchParams: Promise<{
    category?: string
    tags?: string
    q?: string
    sort?: string
    page?: string
  }>
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams
  const category = params.category
  const tags = params.tags?.split(',').filter(Boolean) ?? []
  const query = params.q
  const sort = (params.sort as SortValue | undefined) ?? 'popularity'
  const page = Math.max(1, Number(params.page) || 1)
  const limit = config.pagination.defaultPageSize
  const offset = (page - 1) * limit

  let categories
  try {
    categories = await productService.categories()
  } catch {
    categories = productRepository.categories()
  }

  let listing: { items: Product[]; total: number }
  try {
    listing = await productService.list({
      categorySlug: category,
      tags,
      search: query,
      sort,
      limit,
      offset,
    })
  } catch {
    listing = productRepository.list({
      categorySlug: category,
      tags,
      search: query,
      sort,
      limit,
      offset,
    })
  }

  return (
    <ShopBrowser
      categories={categories}
      initialProducts={listing.items}
      initialTotal={listing.total}
      initialCategory={category}
      initialQuery={query}
      initialSort={sort}
    />
  )
}