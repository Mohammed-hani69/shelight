import { z } from 'zod'

/** التحقق من بيانات الشحن في صفحة الدفع */
export const checkoutSchema = z.object({
  fullName: z.string().min(2, 'اكتبي اسمك بالكامل'),
  phone: z.string().regex(/^\+?[0-9\s-]{8,15}$/, 'اكتبي رقم موبايل صحيح'),
  secondaryPhone: z
    .string()
    .optional()
    .refine((value) => !value || /^\+?[0-9\s-]{8,15}$/.test(value), 'رقم الموبايل مش صحيح'),
  governorate: z.string().min(1, 'اختاري المحافظة'),
  city: z.string().min(1, 'اكتبي اسم المدينة'),
  address: z.string().min(5, 'اكتبي عنوانك بالتفصيل، 5 حروف على الأقل'),
  notes: z.string().optional(),
  paymentMethod: z.enum(['cod', 'card']),
})

export type CheckoutFormValues = z.infer<typeof checkoutSchema>