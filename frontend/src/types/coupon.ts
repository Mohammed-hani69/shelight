/** نتيجة التحقق من رمز الخصم — تطابق استجابة `POST /coupons/validate`. */
export interface CouponValidation {
  valid: boolean
  code: string
  discountType: 'percent' | 'fixed'
  discountAmount: number
}
