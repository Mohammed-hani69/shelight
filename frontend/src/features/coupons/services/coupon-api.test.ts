import { describe, it, expect, vi, beforeEach } from 'vitest'
import { couponApi } from '@/features/coupons/services/coupon-api'
import { apiClient } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}))

describe('couponApi.validate', () => {
  const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('يرسل الكود بعد إزالة الفراغات مع المجموع الفرعي', async () => {
    mockedPost.mockResolvedValue({
      valid: true,
      code: 'SHELIGHT10',
      discountType: 'percent',
      discountAmount: 89,
    })

    const result = await couponApi.validate('  shelight10  ', 890)

    expect(mockedPost).toHaveBeenCalledWith('/coupons/validate', {
      code: 'shelight10',
      subtotal: 890,
    })
    expect(result.discountAmount).toBe(89)
    expect(result.code).toBe('SHELIGHT10')
  })

  it('يمرّر خطأ الخادم كما هو ليُعرض للمستخدم', async () => {
    mockedPost.mockRejectedValue(new Error('الحد الأدنى للطلب مع هذا الرمز هو 500.00 جنيه'))
    await expect(couponApi.validate('SHELIGHT10', 100)).rejects.toThrow('الحد الأدنى')
  })
})
