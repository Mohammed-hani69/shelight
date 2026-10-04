/**
 * خدمة البنرات العامة — تجلب بنرات المتجر من الـ API وتطلق مسارات الصور.
 * عند غياب الـ API أو عدم تفعيل الوضع البعيد تعيد [] فيسقط المتجر على
 * البيانات الثابتة (mock) الموجودة في المكونات.
 */
import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { resolveMediaUrl } from '@/lib/api/media'
import { USE_REMOTE_API } from '@/features/products/services/product-service'
import type { Banner, BannerSection } from '@/types/banner'

export const bannerService = {
  async list(section?: BannerSection): Promise<Banner[]> {
    if (!USE_REMOTE_API) return []
    try {
      const suffix = section ? `?section=${section}` : ''
      const items = await apiClient.get<Banner[]>(`${endpoints.banners.list}${suffix}`)
      return (items ?? []).map((banner) => ({
        ...banner,
        imageUrl: resolveMediaUrl(banner.imageUrl),
        mobileImageUrl: banner.mobileImageUrl
          ? resolveMediaUrl(banner.mobileImageUrl)
          : null,
      }))
    } catch {
      return []
    }
  },
}
