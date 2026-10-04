import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import type { CouponValidation } from '@/types/coupon'

/**
 * التحقق من رمز الخصم.
 *
 * الخادم هو مصدر الحقيقة: هنا نستعلم فقط لعرض الخصم المتوقّع،
 * لكن الخصم النهائي يُحسب مرة أخرى عند إنشاء الطلب.
 */
export const couponApi = {
  async validate(code: string, subtotal: number): Promise<CouponValidation> {
    return apiClient.post<CouponValidation>(endpoints.coupons.validate, {
      code: code.trim(),
      subtotal,
    })
  },
}
