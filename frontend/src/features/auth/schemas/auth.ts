import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('اكتبي إيميل صحيح'),
  password: z.string().min(6, 'الباسورد لازم يكون 6 حروف على الأقل'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const phoneLoginSchema = z.object({
  identifier: z.string().min(3, 'اكتبي رقم الموبايل أو الإيميل'),
  password: z.string().min(1, 'اكتبي الباسورد'),
})

export type PhoneLoginFormValues = z.infer<typeof phoneLoginSchema>
