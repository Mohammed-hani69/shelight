'use client'

import { useEffect, useState } from 'react'
import { couponApi } from '@/features/coupons/services/coupon-api'
import { useCartStore } from '@/store/cart-store'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

/**
 * خصم الكود المثبَّت في السلة — وهو كود الباقة التي أضافها العميل.
 *
 * بدون هذا تعرض السلة سعر المنتجات كاملاً ثم تنزل الفاتورة عند الدفع،
 * وهو ما يُقرأ على أنه خطأ في السعر لا كخصم. الخصم يُحسب بنفس منطق
 * الخادم: لا يتجاوز المجموع الفرعي.
 *
 * السلوك هنا «صامت» عن قصد: هذه واجهة تعرض سعراً، أما التنبيه على كود
 * غير صالح فيخص صفحة الدفع حيث يكتب العميل الكود بنفسه.
 */
export function usePinnedCoupon(subtotal: number) {
  const couponCode = useCartStore((state) => state.couponCode)
  // نربط الخصم بالكود الذي حُسب له، فلا يبقى خصم قديم ظاهراً
  // بعد تغيير الكود أو إزالته.
  const [validated, setValidated] = useState<{ code: string; amount: number }>({
    code: '',
    amount: 0,
  })

  useEffect(() => {
    if (!couponCode || subtotal <= 0) return
    let active = true
    const request = USE_REMOTE_API
      ? couponApi.validate(couponCode, subtotal)
      : Promise.resolve({
          valid: true,
          code: couponCode,
          discountType: 'fixed' as const,
          discountAmount: Math.round(subtotal * 0.1 * 100) / 100,
        })
    request
      .then((res) => {
        if (active) setValidated({ code: couponCode, amount: Math.min(res.discountAmount, subtotal) })
      })
      .catch(() => {
        // لم يعد صالحاً — نعرض السعر كاملاً بدل رقم غير مؤكد.
        if (active) setValidated({ code: '', amount: 0 })
      })
    return () => {
      active = false
    }
  }, [couponCode, subtotal])

  const discount = validated.code === couponCode ? validated.amount : 0
  return { couponCode, discount }
}