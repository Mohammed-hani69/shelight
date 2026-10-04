import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toCheckoutRequest, orderTrackingApi } from '@/features/orders/services/orders-api'
import { apiClient } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn(), getWithMeta: vi.fn(), post: vi.fn() },
}))

/**
 * طلبات الدفع كانت تنحرف عن عقد `CheckoutSchema` في الـ backend:
 * العنوان كان مسطّحاً، والمحفظة كانت ترسل `cash` بدل `cod`،
 * و`productId` كان يمرّ كسلسلة. هذه الاختبارات تثبّت الشكل الصحيح.
 */
describe('toCheckoutRequest', () => {
  const base = {
    fullName: 'سارة علي',
    phone: '01000000001',
    governorate: 'القاهرة',
    city: 'الجيزة',
    address: '15 شارع الهرم',
    notes: 'اتصل قبل التوصيل',
    paymentMethod: 'cod' as const,
    items: [{ productId: '1', quantity: 2 }],
    email: 'sara@example.com',
  }

  it('يقسّم الاسم الكامل إلى firstName و lastName', () => {
    const req = toCheckoutRequest(base)
    expect(req.shipping.firstName).toBe('سارة')
    expect(req.shipping.lastName).toBe('علي')
  })

  it('يتعامل مع الاسم المفرد', () => {
    const req = toCheckoutRequest({ ...base, fullName: 'سارة' })
    expect(req.shipping.firstName).toBe('سارة')
    expect(req.shipping.lastName).toBe('')
  })

  it('يضع العنوان داخل shipping والبريد في الجذر', () => {
    const req = toCheckoutRequest(base)
    expect(req.email).toBe('sara@example.com')
    expect(req.shipping.phone).toBe('01000000001')
    expect(req.shipping.city).toBe('الجيزة')
    expect(req.shipping.governorate).toBe('القاهرة')
    expect(req.shipping.notes).toBe('اتصل قبل التوصيل')
    expect((req.shipping as Record<string, unknown>).email).toBeUndefined()
  })

  it('يحوّل productId إلى رقم كما يتطلب fields.Int', () => {
    const req = toCheckoutRequest({
      ...base,
      items: [
        { productId: '1', quantity: 2 },
        { productId: '5', quantity: 1 },
      ],
    })
    expect(req.items).toEqual([
      { productId: 1, quantity: 2 },
      { productId: 5, quantity: 1 },
    ])
    req.items.forEach((item) => expect(typeof item.productId).toBe('number'))
  })

  it('يرسل paymentMethod من القيم التي يقبلها الخادم فقط', () => {
    expect(toCheckoutRequest(base).paymentMethod).toBe('cod')
    expect(toCheckoutRequest({ ...base, paymentMethod: 'card' }).paymentMethod).toBe('card')
  })

  it('يملأ couponCode و notes بنص فارغ بدل undefined', () => {
    const req = toCheckoutRequest({
      ...base,
      notes: undefined,
      couponCode: undefined,
      email: undefined,
    })
    expect(req.couponCode).toBe('')
    expect(req.shipping.notes).toBe('')
  })

  it('يمرّر كود الخصم المطبَّق كما هو', () => {
    expect(toCheckoutRequest({ ...base, couponCode: 'BUNDLE-LUMINOUS' }).couponCode).toBe(
      'BUNDLE-LUMINOUS'
    )
  })
})

/**
 * تتبّع الطلب لزائر: المسار والتطبيع ومخرجات الـ adapter.
 */
describe('orderTrackingApi.track', () => {
  const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockedGet.mockReset()
  })

  it('يطلب مسار التتبّع العام مع الموبايل واللغة', async () => {
    mockedGet.mockResolvedValue({
      orderNumber: 'SL-20260101-123456',
      status: 'shipped',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      total: 950,
      itemCount: 2,
      placedAt: '2026-01-01T10:00:00',
      firstName: 'سارة',
      city: 'الجيزة',
      governorate: 'القاهرة',
      items: [
        {
          id: '7',
          productId: '1',
          name: 'سيروم الإشراقة',
          slug: 'luminous-glow-serum',
          image: 'https://cdn.example/serum.jpg',
          unitPrice: 890,
          quantity: 1,
        },
      ],
    })

    const tracked = await orderTrackingApi.track('  SL-20260101-123456  ', '01000000000')

    expect(mockedGet).toHaveBeenCalledTimes(1)
    const calledPath = mockedGet.mock.calls[0][0] as string
    // المسار العام وليس مسار العميل المحمي
    expect(calledPath).toContain('/orders/track/SL-20260101-123456')
    // رقم الموبايل يُرسل كما هو ولا يُفقد
    expect(calledPath).toContain('phone=01000000000')
    expect(calledPath).toContain('lang=ar')

    expect(tracked.number).toBe('SL-20260101-123456')
    expect(tracked.status).toBe('shipped')
    expect(tracked.itemCount).toBe(2)
    // لا تسريب حقول حساسة في النوع
    expect(tracked).not.toHaveProperty('phone')
    expect(tracked.items[0]).toMatchObject({
      id: '7',
      name: 'سيروم الإشراقة',
      price: 890,
      quantity: 1,
    })
  })

  it('يحمي المسار من رموز غريبة في رقم الطلب', async () => {
    mockedGet.mockResolvedValue({ items: [] })
    await orderTrackingApi.track('SL/../etc', '01000000000').catch(() => undefined)
    const calledPath = mockedGet.mock.calls[0][0] as string
    expect(calledPath).not.toContain('/orders/track/SL/../etc')
    expect(calledPath).toContain(encodeURIComponent('SL/../etc'))
  })
})
