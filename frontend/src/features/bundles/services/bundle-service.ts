import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { bundles as mockBundles } from '@/mock-data/bundles'
import { productRepository } from '@/services/catalog-service'
import type { Bundle } from '@/types/bundle'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

/** ملء النسخة المحلية بأعضائها من بيانات المنتجات — لوضع التصميم فقط. */
function hydrateMockBundles(): Bundle[] {
  return mockBundles.map((bundle) => {
    const items = bundle.items.flatMap((item) => {
      const product = productRepository.getById(item.productId)
      return product ? [{ productId: item.productId, quantity: item.quantity, product }] : []
    })
    return {
      ...bundle,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    }
  })
}

/**
 * خدمة الباقات (الطقوس الجاهزة).
 *
 * في الوضع الحقيقي تأتي من `GET /bundles` مع أعضائها كبيانات منتج كاملة،
 * ومعها `couponCode` الذي يجعل الطلب يساوي `price` المعلن للباقة.
 */
export const bundleService = {
  async list(): Promise<Bundle[]> {
    if (!USE_REMOTE_API) return hydrateMockBundles()
    return apiClient.get<Bundle[]>(`${endpoints.bundles.list}?lang=ar`)
  },

  async getBySlug(slug: string): Promise<Bundle | undefined> {
    if (!USE_REMOTE_API) return hydrateMockBundles().find((b) => b.slug === slug)
    return apiClient.get<Bundle>(`${endpoints.bundles.detail(slug)}?lang=ar`)
  },
}
