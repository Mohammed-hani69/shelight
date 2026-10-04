/** نوع المنتج الأساسي مع جميع بيانات العرض والمتغيرات */

export type InventoryStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'preorder'

export interface ProductVariant {
  id: string
  name: string
  sku: string
  price: number
  compareAtPrice?: number
  stock: number
}

export interface ProductImage {
  id: string
  url: string
  alt: string
}

export interface Product {
  id: string
  slug: string
  name: string
  price: number
  compareAtPrice?: number
  description: string
  benefits: string[]
  ingredients: string[]
  howToUse: string[]
  suitableFor: string[]
  faqs: { question: string; answer: string }[]
  category: CategorySummary
  variants: ProductVariant[]
  images: ProductImage[]
  videoUrl?: string
  rating: number
  reviewCount: number
  inventoryStatus: InventoryStatus
  stock: number
  tags: string[]
  isBestseller: boolean
  isNew: boolean
  featured?: boolean
  created_at: string
}

export interface CategorySummary {
  id: string
  slug: string
  name: string
}

export interface Category {
  id: string
  slug: string
  name: string
  description?: string
  image?: string
  products: Product[]
  children?: Category[]
  /** حقول إدارة يرسلها الـ backend — للرئيسية والتنقل وللتحكم من اللوحة. */
  nameAr?: string
  isFeatured?: boolean
  isActive?: boolean
  sortOrder?: number
}
