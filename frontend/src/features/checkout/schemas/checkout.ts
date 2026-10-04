import { z } from 'zod'

/** التحقق من بيانات الشحن في صفحة الدفع */
export const checkoutSchema = z.object({
  fullName: z.string().min(2, 'الاسم الكامل مطلوب'),
  phone: z.string().regex(/^\+?[0-9\s-]{8,15}$/, 'أدخلي رقم هاتف صالح'),
  secondaryPhone: z
    .string()
    .optional()
    .refine((value) => !value || /^\+?[0-9\s-]{8,15}$/.test(value), 'رقم هاتف غير صالح'),
  governorate: z.string().min(1, 'اختاري المحافظة'),
  city: z.string().min(1, 'المدينة مطلوبة'),
  address: z.string().min(5, 'العنوان يجب أن يكون 5 أحرف على الأقل'),
  notes: z.string().optional(),
  paymentMethod: z.enum(['cod', 'card']),
})

export type CheckoutFormValues = z.infer<typeof checkoutSchema>