import type { Cart, CartItem } from '@/types/cart'
import type { Product } from '@/types/product'

/**
 * حساب منطق السلة: المجموع، الخصم، الشحن.
 * هذا منطق عرض إرشادي؛ التحقق النهائي يتم دائماً على الـ backend.
 */

export const FREE_SHIPPING_THRESHOLD = 1500
export const SHIPPING_COST = 60

export interface CartCalculations {
  subtotal: number
  shipping: number
  total: number
  remainingForFreeShipping: number
}

export function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function calcCartCalculations(items: CartItem[]): CartCalculations {
  const subtotal = calcSubtotal(items)
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  return { subtotal, shipping, total: subtotal + shipping, remainingForFreeShipping }
}

/** إنشاء عنصر سلة من منتج + كمية */
export function buildCartItem(product: Product, quantity = 1): CartItem {
  return {
    id: `${product.id}-${Date.now()}`,
    productId: product.id,
    productSlug: product.slug,
    name: product.name,
    image: product.images[0]?.url ?? '',
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    quantity,
    stock: product.stock,
  }
}

export function emptyCart(id = 'mock-cart'): Cart {
  return { id, items: [], subtotal: 0, discount: 0, shipping: 0, total: 0 }
}