import { z } from 'zod'

/** التحقق من بيانات الحساب */
export const profileSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  address: z.string().min(5, 'العنوان يجب أن يكون 5 أحرف على الأقل'),
  governorate: z.string().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{8,15}$/, 'أدخلي رقم هاتف صالح')
    .optional()
    .or(z.literal('')),
  city: z.string().optional(),
  newsletter: z.boolean().default(true),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

/** يقسّم حقل "الاسم الكامل" إلى firstName/lastName كما يقبلها `ProfileUpdateSchema`. */
export function splitFullName(fullName: string): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '' }
  if (parts.length === 1) return { firstName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}