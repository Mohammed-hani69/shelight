import type { Product, Category, ProductVariant } from '@/types/product'
import { products as mockProducts } from '@/mock-data/products'
import { categories as mockCategories } from '@/mock-data/categories'

/**
 * طبقة الوصول للبيانات (Data Access Layer).
 *
 * حالياً هذه الطبقة تستخدم Mock Data محلياً.
 * عند ربط الـ Flask API يكفي استبدال دوال الـ repository
 * الثالثة (productService, catalogService) بإصدار API بلا تغيير الـ UI.
 *
 * نستخدم "Composition" بسيطاً:
 * ProductCard → hook → service → (repository | API) → data
 */

// ---------- Product repository (currently mock) ----------
export interface ProductQuery {
  categorySlug?: string
  search?: string
  tags?: string[]
  isBestseller?: boolean
  isNew?: boolean
  sort?: 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'popularity'
  limit?: number
  offset?: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  offset: number
  limit: number
}

function resolveVariant(product: Product, variantId?: string): ProductVariant {
  if (!variantId) return product.variants[0] ?? product.variants[0]
  return product.variants.find((v) => v.id === variantId) ?? product.variants[0]
}

export const productRepository = {
  list(query: ProductQuery = {}): Paginated<Product> {
    let items = [...mockProducts]

    if (query.categorySlug) {
      items = items.filter((p) => p.category.slug === query.categorySlug)
    }
    if (query.search) {
      const q = query.search.toLowerCase()
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (query.tags?.length) {
      items = items.filter((p) => p.tags.some((t) => query.tags!.includes(t)))
    }
    if (query.isBestseller) items = items.filter((p) => p.isBestseller)
    if (query.isNew) items = items.filter((p) => p.isNew)

    switch (query.sort) {
      case 'price-asc':
        items.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        items.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        items.sort((a, b) => b.rating - a.rating)
        break
      case 'newest':
        items.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        break
      case 'popularity':
      default:
        items.sort((a, b) => b.reviewCount - a.reviewCount)
        break
    }

    const total = items.length
    const limit = query.limit ?? items.length
    const offset = query.offset ?? 0
    items = items.slice(offset, offset + limit)

    return { items, total, offset, limit }
  },

  getBySlug(slug: string): Product | undefined {
    return mockProducts.find((p) => p.slug === slug)
  },

  getById(id: string): Product | undefined {
    return mockProducts.find((p) => p.id === id)
  },

  related(product: Product, limit = 4): Product[] {
    return mockProducts
      .filter((p) => p.category.slug === product.category.slug && p.id !== product.id)
      .concat(mockProducts.filter((p) => p.category.slug !== product.category.slug))
      .slice(0, limit)
  },

  bestsellers(limit = 8): Product[] {
    return mockProducts
      .filter((p) => p.isBestseller)
      .slice(0, limit)
  },

  newArrivals(limit = 8): Product[] {
    return mockProducts
      .filter((p) => p.isNew)
      .slice(0, limit)
  },

  categories(): Category[] {
    return mockCategories
  },

  resolveVariant,
}

// ---------- Catalog repository (categories + bundles) ----------
export const catalogRepository = {
  categories(): Category[] {
    return mockCategories
  },

  getCategoryBySlug(slug: string): Category | undefined {
    const category = mockCategories.find((c) => c.slug === slug)
    if (!category) return undefined
    const products = productRepository.list({ categorySlug: slug }).items
    return { ...category, products }
  },
}