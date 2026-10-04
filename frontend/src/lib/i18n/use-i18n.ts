'use client'

import { useEffect } from 'react'
import { useI18nStore } from '@/store/i18n-store'

/** معلومات الترجمة واللغة الحالية للاستخدام في المكونات */
export function useI18n() {
  const locale = useI18nStore((s) => s.locale)
  const t = useI18nStore((s) => s.t)
  const setLocale = useI18nStore((s) => s.setLocale)
  const toggleLocale = useI18nStore((s) => s.toggleLocale)

  // Sync document lang/dir after rehydration
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])

  return { locale, t, setLocale, toggleLocale }
}
