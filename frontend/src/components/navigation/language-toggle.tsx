'use client'

import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/use-i18n'

/** تبديل اللغة (عربي / English) — يظهر في الهيدر */
export function LanguageToggle() {
  const { t, locale, toggleLocale } = useI18n()
  const isAr = locale === 'ar'

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      aria-label={isAr ? 'Switch to English' : t.a11y.switchLang}
      className="gap-1 text-xs font-semibold"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      {isAr ? 'EN' : 'عربي'}
    </Button>
  )
}
