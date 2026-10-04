import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import type { Product, Category } from '@/types/product'
import type { ProductQuery } from '@/services/catalog-service'
import type { BackendCategoryNode, BackendMeta, BackendProductDetail, BackendProductListItem } from '@/lib/api/backend-mappers'
import { mapCategory, mapProductDetail, mapProductListItem, withLang } from '@/lib/api/backend-mappers'
import { toApiSort } from '@/lib/api/sort-map'

const DEFAULT_LIMIT = 12

export const productApi = {
  async list(query: ProductQuery = {}): Promise<{ items: Product[]; total: number; offset: number; limit: number }> {
    const limit = query.limit ?? DEFAULT_LIMIT
    const searchParams = new URLSearchParams()
    if (query.categorySlug) searchParams.set('category', query.categorySlug)
    if (query.search) searchParams.set('search', query.search)
    if (query.tags?.length) searchParams.set('tag', query.tags[0])
    if (query.isBestseller) searchParams.set('bestseller', 'true')
    if (query.isNew) searchParams.set('sort', 'newest')
    const sort = toApiSort(query.sort)
    if (sort) searchParams.set('sort', sort)
    if (query.limit) searchParams.set('page_size', String(limit))
    if (query.offset) searchParams.set('page', String(Math.floor(query.offset / limit) + 1))

    const { items, meta } = await apiClient.getWithMeta<BackendProductListItem[], BackendMeta>(
      `${endpoints.products.list}?${withLang(searchParams, 'ar')}`
    )
    const mapped = (items ?? []).map(mapProductListItem)

    return {
      items: mapped,
      total: meta?.total ?? mapped.length,
      offset: query.offset ?? 0,
      limit,
    }
  },

  async getBySlug(slug: string): Promise<Product> {
    const res = await apiClient.get<BackendProductDetail>(
      `${endpoints.products.detail(slug)}?lang=ar`
    )
    return mapProductDetail(res)
  },

  /** تفاصيل بالمعرّف الرقمي — تحتاجه الصفحات التي تحفظ معرّفات فقط (الأمنيات). */
  async getById(id: string): Promise<Product> {
    const res = await apiClient.get<BackendProductDetail>(
      `${endpoints.products.detailById(id)}?lang=ar`
    )
    return mapProductDetail(res)
  },

  async bestsellers(limit = 8): Promise<Product[]> {
    const res = await apiClient.get<BackendProductListItem[]>(
      `${endpoints.products.list}?${withLang(new URLSearchParams({ bestseller: 'true', page_size: String(limit) }), 'ar')}`
    )
    return (res ?? []).map(mapProductListItem)
  },

  async newArrivals(limit = 8): Promise<Product[]> {
    const res = await apiClient.get<BackendProductListItem[]>(
      `${endpoints.products.list}?${withLang(new URLSearchParams({ sort: 'newest', page_size: String(limit) }), 'ar')}`
    )
    return (res ?? []).map(mapProductListItem)
  },

  async related(slug: string): Promise<Product[]> {
    // لا يوجد endpoint للـ related في الـ backend؛ نستخدم منتجات الفئة نفسها
    try {
      const product = await this.getBySlug(slug)
      if (!product?.category?.slug) return []
      const sameCategory = await this.list({ categorySlug: product.category.slug, limit: 5 })
      return sameCategory.items.filter((p) => p.slug !== slug).slice(0, 4)
    } catch {
      return []
    }
  },

  async categories(options: { featured?: boolean } = {}): Promise<Category[]> {
    const params = new URLSearchParams()
    if (options.featured) params.set('featured', 'true')
    const res = await apiClient.get<BackendCategoryNode[]>(
      `${endpoints.categories.list}?${withLang(params, 'ar')}`
    )
    return (res ?? []).map(mapCategory)
  },
}
