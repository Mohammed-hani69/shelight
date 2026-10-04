import type { Cart, CartItem } from '@/types/cart'
import { emptyCart } from '@/features/cart/utils/cart-utils'

/**
 * خدمة السلة (Mock).
 * عند الربط بالـ backend، نستبدل التنفيذ بدوال الـ API
 * دون تغيير أي مكون UI.
 */

let serverCart: Cart = emptyCart()

export const cartService = {
  async getCart(): Promise<Cart> {
    return structuredClone(serverCart)
  },

  async addItem(item: CartItem): Promise<Cart> {
    const existing = serverCart.items.find(
      (i) => i.productId === item.productId && i.variantId === item.variantId
    )
    if (existing) {
      existing.quantity = Math.min(existing.quantity + item.quantity, existing.stock)
    } else {
      serverCart.items.push(item)
    }
    return structuredClone(serverCart)
  },

  async updateItem(id: string, quantity: number): Promise<Cart> {
    const item = serverCart.items.find((i) => i.id === id)
    if (item) item.quantity = Math.max(1, Math.min(quantity, item.stock))
    return structuredClone(serverCart)
  },

  async removeItem(id: string): Promise<Cart> {
    serverCart.items = serverCart.items.filter((i) => i.id !== id)
    return structuredClone(serverCart)
  },

  async clear(): Promise<Cart> {
    serverCart = emptyCart()
    return structuredClone(serverCart)
  },
}
