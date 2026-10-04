import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { cartService as mockCartService } from '@/features/cart/services/cart-mock'
import type { Cart, CartItem } from '@/types/cart'
import { useAuthStore } from '@/store/auth-store'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

/** السلة موثّقة بحساب العميل، فلا تملك معرّفاً خاصاً — نستخدم ثابتاً للـ id. */
const REMOTE_CART_ID = 'remote-cart'

interface BackendCartItem {
  id: string
  productId: string
  productSlug: string
  name: string
  image: string
  price: number
  quantity: number
  stock: number
}

interface BackendCartResponse {
  items: BackendCartItem[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  freeShippingThreshold: number
}

function mapBackendCart(res: BackendCartResponse): Cart {
  return {
    id: REMOTE_CART_ID,
    items: (res.items ?? []).map((item) => ({
      id: String(item.id),
      productId: String(item.productId),
      productSlug: item.productSlug ?? '',
      name: item.name,
      image: item.image ?? '',
      price: item.price,
      quantity: item.quantity,
      stock: item.stock,
    })),
    subtotal: res.subtotal ?? 0,
    discount: res.discount ?? 0,
    shipping: res.shipping ?? 0,
    total: res.total ?? 0,
  }
}

function cartUrl(path: string): string {
  return `${path}?lang=ar`
}

export const cartService = {
  async getCart(): Promise<Cart> {
    if (!USE_REMOTE_API || !useAuthStore.getState().isAuthenticated) {
      return mockCartService.getCart()
    }
    const res = await apiClient.get<BackendCartResponse>(cartUrl(endpoints.cart.get))
    return mapBackendCart(res)
  },

  async addItem(item: CartItem): Promise<Cart> {
    if (!USE_REMOTE_API || !useAuthStore.getState().isAuthenticated) {
      return mockCartService.addItem(item)
    }
    const res = await apiClient.post<BackendCartResponse>(cartUrl(endpoints.cart.addItem), {
      productId: item.productId,
      quantity: item.quantity,
    })
    return mapBackendCart(res)
  },

  async updateItem(id: string, quantity: number): Promise<Cart> {
    if (!USE_REMOTE_API || !useAuthStore.getState().isAuthenticated) {
      return mockCartService.updateItem(id, quantity)
    }
    const res = await apiClient.patch<BackendCartResponse>(
      cartUrl(endpoints.cart.updateItem(id)),
      { quantity }
    )
    return mapBackendCart(res)
  },

  async removeItem(id: string): Promise<Cart> {
    if (!USE_REMOTE_API || !useAuthStore.getState().isAuthenticated) {
      return mockCartService.removeItem(id)
    }
    const res = await apiClient.delete<BackendCartResponse>(cartUrl(endpoints.cart.removeItem(id)))
    return mapBackendCart(res)
  },

  async clear(): Promise<Cart> {
    if (!USE_REMOTE_API || !useAuthStore.getState().isAuthenticated) {
      return mockCartService.clear()
    }
    const cart = await this.getCart()
    for (const item of cart.items) {
      await this.removeItem(item.id)
    }
    return this.getCart()
  },
}
