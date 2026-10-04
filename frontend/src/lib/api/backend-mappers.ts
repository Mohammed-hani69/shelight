/**
 * طبقة تطبيع استجابات الـ backend إلى عقود الواجهة.
 *
 * الـ Flask يعيد `{ data, meta? }` ومفاتيح camelCase، لكن بعض الحقول
 * الناقصة في القوائم تُملأ بقيم آمنة هنا حتى لا تنهار الواجهة.
 * كل adapter يستدعي هذه الدوال ولا يصلح الحقول يدوياً.
 */

import type { Category, InventoryStatus, Product } from '@/types/product'

export interface BackendMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
}

export interface BackendImage {
  id: string
  url: string
  alt?: string | null
}

export interface BackendCategoryBrief {
  id: string
  slug: string
  name: string
}

export interface BackendProductListItem {
  id: string
  slug: string
  name: string
  shortDescription?: string | null
  price: number
  compareAtPrice?: number | null
  stock: number
  inventoryStatus: string
  tags: string[]
  category?: BackendCategoryBrief | null
  images: BackendImage[]
  isBestseller: boolean
  isNew: boolean
  featured?: boolean
  rating?: number
  reviewCount?: number
}

export interface BackendProductDetail extends BackendProductListItem {
  description?: string | null
  benefits?: string[] | null
  ingredients?: string[] | null
  howToUse?: string[] | null
  suitableFor?: string[] | null
  faqs?: { question: string; answer: string }[] | null
  variants?: { id: string; name: string; sku: string; price: number; compareAtPrice?: number | null; stock: number }[] | null
  concerns?: { id: string; slug: string; name: string }[] | null
  createdAt?: string | null
}

const EMPTY_CATEGORY = { id: '', slug: '', name: '' }

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/**
 * يحوّل عنصر بطاقة المنتج من الـ backend إلى نوع `Product`.
 *
 * حقول التفاصيل (description/benefits/…) ليست في استجابة القوائم،
 * لذلك نملأها بقيم فارغة آمنة — صفحة التفاصيل هي من يملؤها فعلياً.
 */
export function mapProductListItem(item: BackendProductListItem): Product {
  return {
    id: asString(item.id),
    slug: asString(item.slug),
    name: asString(item.name),
    price: typeof item.price === 'number' ? item.price : 0,
    compareAtPrice: item.compareAtPrice ?? undefined,
    description: asString(item.shortDescription),
    benefits: [],
    ingredients: [],
    howToUse: [],
    suitableFor: [],
    faqs: [],
    category: item.category
      ? { id: asString(item.category.id), slug: asString(item.category.slug), name: asString(item.category.name) }
      : EMPTY_CATEGORY,
    variants: [],
    images: Array.isArray(item.images)
      ? item.images.map((image) => ({
          id: asString(image.id),
          url: asString(image.url),
          alt: asString(image.alt),
        }))
      : [],
    rating: item.rating ?? 0,
    reviewCount: item.reviewCount ?? 0,
    inventoryStatus: (item.inventoryStatus ?? 'in-stock') as InventoryStatus,
    stock: typeof item.stock === 'number' ? item.stock : 0,
    tags: asStringArray(item.tags),
    isBestseller: Boolean(item.isBestseller),
    isNew: Boolean(item.isNew),
    featured: Boolean(item.featured),
    created_at: '',
  }
}

/** يحوّل تفاصيل المنتج الكاملة، مع الحفاظ على أي حقل ناقص بقيمة آمنة. */
export function mapProductDetail(item: BackendProductDetail): Product {
  const base = mapProductListItem(item)
  return {
    ...base,
    description: asString(item.description, base.description),
    benefits: asStringArray(item.benefits),
    ingredients: asStringArray(item.ingredients),
    howToUse: asStringArray(item.howToUse),
    suitableFor: asStringArray(item.suitableFor),
    faqs: Array.isArray(item.faqs) ? item.faqs : [],
    variants: Array.isArray(item.variants)
      ? item.variants.map((variant) => ({
          id: asString(variant.id),
          name: asString(variant.name),
          sku: asString(variant.sku),
          price: variant.price,
          compareAtPrice: variant.compareAtPrice ?? undefined,
          stock: variant.stock,
        }))
      : [],
    created_at: asString(item.createdAt),
  }
}

export interface BackendCategoryNode {
  id: string
  slug: string
  name: string
  nameAr?: string | null
  description?: string | null
  image?: string | null
  isFeatured?: boolean
  isActive?: boolean
  sortOrder?: number
  children?: BackendCategoryNode[] | null
}

export function mapCategory(node: BackendCategoryNode): Category {
  return {
    id: asString(node.id),
    slug: asString(node.slug),
    name: asString(node.name),
    nameAr: node.nameAr ?? undefined,
    isFeatured: Boolean(node.isFeatured),
    isActive: node.isActive ?? true,
    sortOrder: typeof node.sortOrder === 'number' ? node.sortOrder : undefined,
    description: node.description ?? undefined,
    image: node.image ?? undefined,
    products: [],
    children: Array.isArray(node.children) ? node.children.map(mapCategory) : undefined,
  }
}

/** يبني معاملات الاستعلام مع اللغة المطلوبة بشكل موحّد. */
export function withLang(params: URLSearchParams, lang: string): string {
  const next = new URLSearchParams(params)
  next.set('lang', lang)
  return next.toString()
}
