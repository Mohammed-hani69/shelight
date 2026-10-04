import type { Product } from '@/types/product'

/** عضو الباقة — المنتج وكميته كما تأتي من الـ backend. */
export interface BundleItem {
  productId: string
  quantity: number
  product: Product
}

export interface Bundle {
  id: string
  slug: string
  name: string
  description: string
  image: string
  items: BundleItem[]
  itemCount: number
  price: number
  compareAtPrice: number
  /** كود الخصم الذي يجعل الطلب يساوي `price` المعلن. */
  couponCode?: string
  badge?: string
  rating: number
  reviewCount: number
}
