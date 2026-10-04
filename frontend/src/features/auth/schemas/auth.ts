import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('أدخلي بريداً إلكترونياً صالحاً'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const phoneLoginSchema = z.object({
  identifier: z.string().min(3, 'أدخلي رقم الهاتف أو البريد الإلكتروني'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})

export type PhoneLoginFormValues = z.infer<typeof phoneLoginSchema>
