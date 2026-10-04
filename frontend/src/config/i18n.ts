import { dir as dirFn, type Locale } from '@/lib/i18n'

export { locales, defaultLocale, getDir } from '@/lib/i18n'
export type { Locale } from '@/lib/i18n'

/** وظيفة مساعدة للاستخدام داخل المكونات (LTR/RTL) */
export const dir: (locale: Locale) => 'ltr' | 'rtl' = dirFn
