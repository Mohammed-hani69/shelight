import { z } from 'zod'

export const registerSchema = z
  .object({
    name: z.string().min(2, 'اكتبي اسمك، حرفين على الأقل'),
    phone: z.string().regex(/^\+?[0-9\s-]{8,15}$/, 'اكتبي رقم موبايل صحيح'),
    address: z.string().min(5, 'اكتبي عنوانك بالتفصيل، 5 حروف على الأقل'),
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

/**
 * يقسّم حقل "الاسم الكامل" إلى firstName/lastName كما يتوقعها الـ backend.
 * الاسم الأول ما قبل آخر فاصل، والباقي عائلة — وهو التوزيع الشائع بالعربية.
 */
export function splitFullName(fullName: string): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '' }
  if (parts.length === 1) return { firstName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}
