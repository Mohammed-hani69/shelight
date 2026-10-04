'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultLocale, type Locale } from '@/config/i18n'
import { en, type Dictionary } from '@/lib/dictionaries/en'
import { ar } from '@/lib/dictionaries/ar'

type DictionaryMap = Record<Locale, Dictionary>

const dictionaries: DictionaryMap = { en, ar }

interface I18nState {
  locale: Locale
  t: Dictionary
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

function applyDocumentLocale(locale: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: defaultLocale,
      t: dictionaries[defaultLocale],
      setLocale: (locale) => {
        set({ locale, t: dictionaries[locale] })
        applyDocumentLocale(locale)
      },
      toggleLocale: () => {
        const next: Locale = get().locale === 'en' ? 'ar' : 'en'
        set({ locale: next, t: dictionaries[next] })
        applyDocumentLocale(next)
      },
    }),
    {
      name: 'shelight-locale',
      // مهم: تخطّي الاستعادة الفورية من localStorage حتى تتطابق أول عملية
      // render في المتصفح مع HTML المُرسل من الخادم (تفادي hydration mismatch)
      skipHydration: true,
      partialize: (state) => ({ locale: state.locale }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { locale?: Locale } | undefined
        const locale: Locale =
          persisted?.locale === 'en' || persisted?.locale === 'ar'
            ? persisted.locale
            : currentState.locale
        return {
          ...currentState,
          locale,
          t: dictionaries[locale],
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyDocumentLocale(state.locale)
      },
    }
  )
)
