export type Locale = 'en' | 'ar'

export const locales: Locale[] = ['en', 'ar']
export const defaultLocale: Locale = 'ar'

export const dir = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr')

/** كونفرت لاتجاه HTML بناءً على اللغة الحالية */
export function getDir(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}
