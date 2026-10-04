import { describe, it, expect } from 'vitest'
import { productRepository } from '@/services/catalog-service'

describe('productRepository', () => {
  it('lists all products by default', () => {
    const result = productRepository.list()
    expect(result.total).toBeGreaterThan(0)
    expect(result.items.length).toBe(result.total)
  })

  it('filters by category slug', () => {
    const skin = productRepository.list({ categorySlug: 'skin-care' })
    expect(skin.items.length).toBeGreaterThan(0)
    expect(skin.items.every((p) => p.category.slug === 'skin-care')).toBe(true)
  })

  it('searches by name', () => {
    const result = productRepository.list({ search: 'serum' })
    expect(result.items.length).toBeGreaterThan(0)
  })

  it('sorts by price ascending', () => {
    const { items } = productRepository.list({ sort: 'price-asc' })
    const prices = items.map((p) => p.price)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)
  })

  it('gets a product by slug', () => {
    const product = productRepository.getBySlug('luminous-glow-serum')
    expect(product?.name).toBe('سيروم التوهج المضيء')
    expect(productRepository.getBySlug('does-not-exist')).toBeUndefined()
  })
})