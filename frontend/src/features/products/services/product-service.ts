/**
 * نقطة الدخول الموحدة لخدمة المنتجات.
 * الفكرة: الـ UI لا يعرف مصدر البيانات (Mock أو Flask).
 * نتحكم بالمصدر من خلال متغير بيئة.
 */
import { productRepository } from '@/services/catalog-service'
import type { Product, Category } from '@/types/product'
import type { Paginated, ProductQuery } from '@/services/catalog-service'

export const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

async function loadApi() {
  const { productApi } = await import('./product-api')
  return productApi
}

export const productService = {
  async list(query: ProductQuery = {}): Promise<Paginated<Product>> {
    if (!USE_REMOTE_API) return productRepository.list(query)
    const api = await loadApi()
    return api.list(query)
  },

  async getBySlug(slug: string): Promise<Product | undefined> {
    if (!USE_REMOTE_API) return productRepository.getBySlug(slug)
    const api = await loadApi()
    return api.getBySlug(slug)
  },

  async getById(id: string): Promise<Product | undefined> {
    if (!USE_REMOTE_API) return productRepository.getById(id)
    const api = await loadApi()
    try {
      return await api.getById(id)
    } catch {
      return undefined
    }
  },

  async bestsellers(limit = 8): Promise<Product[]> {
    if (!USE_REMOTE_API) return productRepository.bestsellers(limit)
    const api = await loadApi()
    return api.bestsellers(limit)
  },

  async newArrivals(limit = 8): Promise<Product[]> {
    if (!USE_REMOTE_API) return productRepository.newArrivals(limit)
    const api = await loadApi()
    return api.newArrivals(limit)
  },

  async related(product: Product): Promise<Product[]> {
    if (!USE_REMOTE_API) return productRepository.related(product)
    const api = await loadApi()
    return api.related(product.slug)
  },

  async categories(options?: { featured?: boolean }): Promise<Category[]> {
    if (!USE_REMOTE_API) return productRepository.categories()
    const api = await loadApi()
    return api.categories(options)
  },
}