import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>

const PAYLOAD = [
  {
    id: '2',
    slug: 'bright-eye-duo',
    name: 'ثنائي العيون المشرق',
    description: 'كريم عين ومعزز فيتامين C',
    image: 'https://images.unsplash.com/photo-1',
    items: [
      { productId: '5', quantity: 1, product: { id: '5', slug: 'eye-bright-cream' } },
      { productId: '1', quantity: 1, product: { id: '1', slug: 'luminous-glow-serum' } },
    ],
    itemCount: 2,
    price: 1190,
    compareAtPrice: 1610,
    couponCode: 'BUNDLE-EYE',
    badge: 'طقم ثنائي',
    rating: 4.8,
    reviewCount: 96,
  },
]

describe('bundleService في الوضع الحقيقي', () => {
  beforeEach(() => {
    vi.resetModules()
    mockedGet.mockReset()
    vi.stubEnv('NEXT_PUBLIC_USE_REMOTE_API', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('يقرأ الباقات من الـ API بدل بيانات mock', async () => {
    mockedGet.mockResolvedValue(PAYLOAD)
    const { bundleService } = await import('@/features/bundles/services/bundle-service')

    const bundles = await bundleService.list()

    expect(mockedGet).toHaveBeenCalledWith('/bundles?lang=ar')
    expect(bundles).toHaveLength(1)
    // الأعضاء تأتي كبيانات منتج كاملة — وهي ما نحتاجه لإضافتها للسلة.
    expect(bundles[0].items.map((item) => item.product.slug)).toEqual([
      'eye-bright-cream',
      'luminous-glow-serum',
    ])
    expect(bundles[0].items[0].quantity).toBe(1)
    expect(bundles[0].itemCount).toBe(2)
  })

  it('يحتفظ بكود الخصم الذي يجعل الطلب يساوي سعر الباقة', async () => {
    mockedGet.mockResolvedValue(PAYLOAD)
    const { bundleService } = await import('@/features/bundles/services/bundle-service')

    const [bundle] = await bundleService.list()

    expect(bundle.couponCode).toBe('BUNDLE-EYE')
    expect(bundle.compareAtPrice - bundle.price).toBeGreaterThan(0)
  })

  it('يقرأ باقة واحدة بالـ slug', async () => {
    mockedGet.mockResolvedValue(PAYLOAD[0])
    const { bundleService } = await import('@/features/bundles/services/bundle-service')

    const bundle = await bundleService.getBySlug('bright-eye-duo')

    expect(mockedGet).toHaveBeenCalledWith('/bundles/bright-eye-duo?lang=ar')
    expect(bundle?.slug).toBe('bright-eye-duo')
  })
})
