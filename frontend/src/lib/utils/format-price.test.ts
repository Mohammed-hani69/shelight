import { describe, it, expect } from 'vitest'
import { discountPercent, formatPrice } from '@/lib/utils/format-price'

describe('formatPrice', () => {
  it('formats a price with two decimals and the LE symbol', () => {
    expect(formatPrice(1299)).toBe('1,299.00 LE')
  })

  it('formats a price with decimals', () => {
    expect(formatPrice(890.5)).toBe('890.50 LE')
  })
})

describe('discountPercent', () => {
  it('computes the discount percentage between original and sale', () => {
    expect(discountPercent(2000, 1500)).toBe(25)
  })

  it('returns 0 when original price is missing or zero', () => {
    expect(discountPercent(0, 100)).toBe(0)
  })

  it('returns 0 when sale price is higher', () => {
    expect(discountPercent(100, 200)).toBe(-100)
  })
})