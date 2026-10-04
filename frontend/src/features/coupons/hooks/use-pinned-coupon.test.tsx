import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

const validate = vi.fn()

vi.mock('@/features/coupons/services/coupon-api', () => ({
  couponApi: {
    validate: (...args: unknown[]) => validate(...args),
  },
}))

/**
 * الخطاف يقرأ وضع الاستخدام عند تحميله، فكل اختبار يحتاج نسخته الخاصة
 * منه — ومعه نسخة السلة نفسها، وإلا كتب الاختبار في متجر لا يراه الخطاف.
 */
async function loadEnv() {
  vi.resetModules()
  const store = await import('@/store/cart-store')
  const hook = await import('@/features/coupons/hooks/use-pinned-coupon')
  return { store: store.useCartStore, usePinnedCoupon: hook.usePinnedCoupon }
}

function fixedDiscount(amount: number) {
  return (code: string) =>
    Promise.resolve({ valid: true, code, discountType: 'fixed', discountAmount: amount })
}

describe('usePinnedCoupon', () => {
  beforeEach(() => {
    validate.mockReset()
    localStorage.clear()
    vi.stubEnv('NEXT_PUBLIC_USE_REMOTE_API', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('لا يخصم شيئاً بلا كود مثبَّت', async () => {
    const { store, usePinnedCoupon } = await loadEnv()
    store.setState({ couponCode: null })

    const { result } = renderHook(() => usePinnedCoupon(1960))

    await waitFor(() => expect(result.current.discount).toBe(0))
    expect(validate).not.toHaveBeenCalled()
  })

  it('يحسب خصم كود الباقة على المجموع الفرعي', async () => {
    validate.mockImplementation(fixedDiscount(461))
    const { store, usePinnedCoupon } = await loadEnv()
    act(() => store.setState({ couponCode: 'BUNDLE-LUMINOUS' }))

    const { result } = renderHook(() => usePinnedCoupon(1960))

    await waitFor(() => expect(result.current.discount).toBe(461))
    expect(validate).toHaveBeenCalledWith('BUNDLE-LUMINOUS', 1960)
  })

  it('لا يتجاوز الخصم المجموع الفرعي', async () => {
    validate.mockImplementation(fixedDiscount(5000))
    const { store, usePinnedCoupon } = await loadEnv()
    act(() => store.setState({ couponCode: 'BUNDLE-LUMINOUS' }))

    const { result } = renderHook(() => usePinnedCoupon(1960))

    await waitFor(() => expect(result.current.discount).toBe(1960))
  })

  it('يعرض السعر كاملاً إذا لم يعد الكود صالحاً', async () => {
    validate.mockRejectedValue(new Error('min_spend_not_met'))
    const { store, usePinnedCoupon } = await loadEnv()
    act(() => store.setState({ couponCode: 'BUNDLE-LUMINOUS' }))

    const { result } = renderHook(() => usePinnedCoupon(980))

    await waitFor(() => expect(result.current.discount).toBe(0))
  })

  it('لا يبقي خصم الكود السابق معلّقاً بعد تغيير الكود', async () => {
    validate.mockImplementation((code: string) =>
      Promise.resolve({
        valid: true,
        code,
        discountType: 'fixed',
        discountAmount: code === 'BUNDLE-LUMINOUS' ? 461 : 220,
      })
    )
    const { store, usePinnedCoupon } = await loadEnv()
    act(() => store.setState({ couponCode: 'BUNDLE-LUMINOUS' }))

    const { result, rerender } = renderHook(({ subtotal }) => usePinnedCoupon(subtotal), {
      initialProps: { subtotal: 1960 },
    })
    await waitFor(() => expect(result.current.discount).toBe(461))

    // عميل أضاف باقة أخرى — الخصم الجديد يُحسب ولا يبقى القديم ظاهراً.
    act(() => store.setState({ couponCode: 'BUNDLE-EYE' }))
    rerender({ subtotal: 980 })

    await waitFor(() => expect(result.current.discount).toBe(220))
    expect(result.current.couponCode).toBe('BUNDLE-EYE')
  })
})