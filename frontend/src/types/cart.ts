export interface CartItem {
  id: string
  productId: string
  productSlug: string
  name: string
  image: string
  price: number
  compareAtPrice?: number
  quantity: number
  variantId?: string
  variantName?: string
  stock: number
}

export interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  couponCode?: string
}
