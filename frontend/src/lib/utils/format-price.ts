import { CURRENCY_SYMBOL } from '@/lib/constants'

/**
 * تنسيق السعر بصيغة مصرية موحدة: 1,299.00 LE
 */
export function formatPrice(value: number, currency: string = CURRENCY_SYMBOL): string {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formatted} ${currency}`
}

/** نسبة الخصم بين السعر الأصلي وسعر البيع */
export function discountPercent(original: number, sale: number): number {
  if (!original || original <= 0) return 0
  return Math.round(((original - sale) / original) * 100)
}
