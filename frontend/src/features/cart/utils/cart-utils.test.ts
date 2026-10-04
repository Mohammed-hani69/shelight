import { describe, it, expect } from 'vitest'
import {
  calcCartCalculations,
  calcSubtotal,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
} from '@/features/cart/utils/cart-utils'
import type { CartItem } from '@/types/cart'

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'item-1',
    productId: 'p-1',
    productSlug: 'product',
    name: 'Product',
    image: '',
    price: 500,
    quantity: 1,
    stock: 10,
    ...overrides,
  }
}

describe('calcSubtotal', () => {
  it('sums the line totals', () => {
    const items = [item({ price: 100, quantity: 2 }), item({ price: 50, quantity: 1 })]
    expect(calcSubtotal(items)).toBe(250)
  })

  it('returns 0 for an empty cart', () => {
    expect(calcSubtotal([])).toBe(0)
  })
})

describe('calcCartCalculations', () => {
  it('adds shipping below the free threshold', () => {
    const items = [item({ price: 500, quantity: 1 })]
    const calc = calcCartCalculations(items)
    expect(calc.subtotal).toBe(500)
    expect(calc.shipping).toBe(SHIPPING_COST)
    expect(calc.remainingForFreeShipping).toBe(FREE_SHIPPING_THRESHOLD - 500)
  })

  it('removes shipping at or above the free threshold', () => {
    const items = [item({ price: FREE_SHIPPING_THRESHOLD, quantity: 1 })]
    const calc = calcCartCalculations(items)
    expect(calc.shipping).toBe(0)
    expect(calc.remainingForFreeShipping).toBe(0)
  })

  it('clamps remainingForFreeShipping to zero', () => {
    const items = [item({ price: 2000, quantity: 1 })]
    const calc = calcCartCalculations(items)
    expect(calc.remainingForFreeShipping).toBe(0)
  })

  it('computes total as subtotal plus shipping', () => {
    const items = [item({ price: 400, quantity: 1 })]
    const calc = calcCartCalculations(items)
    expect(calc.total).toBe(400 + SHIPPING_COST)
  })
})