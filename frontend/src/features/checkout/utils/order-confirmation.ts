/**
 * آخر طلب أكمله الزائر — يُحفظ في `sessionStorage` لا في الـ store،
 * حتى تظل شاشة التأكيد صامدة بعد إعادة التحميل ولا تتسرّب لطلب لاحق.
 */
export interface OrderConfirmation {
  number: string
  phone: string
  total: number
  placedAt: string
}

const STORAGE_KEY = 'shelight:last-order-confirmation'

export function saveOrderConfirmation(confirmation: OrderConfirmation): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(confirmation))
  } catch {
    // الوضع الخاص أو تخزين ممتلئ — الشاشة تعمل في نفس الجلسة بلا حفظ.
  }
}

export function readOrderConfirmation(): OrderConfirmation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<OrderConfirmation>
    if (!parsed?.number || typeof parsed.number !== 'string') return null
    return {
      number: parsed.number,
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      total: typeof parsed.total === 'number' ? parsed.total : 0,
      placedAt: typeof parsed.placedAt === 'string' ? parsed.placedAt : '',
    }
  } catch {
    return null
  }
}

export function clearOrderConfirmation(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // لا شيء نفعله.
  }
}
