'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useI18nStore } from '@/store/i18n-store'

/** مزودات عامة للتطبيق: TanStack Query + التنبيهات + الـ Tooltip */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  // استعادة اللغة المحفوظة بعد اكتمال الـ hydration (وليس أثناءه)
  useEffect(() => {
    void useI18nStore.persist.rehydrate()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster richColors closeButton position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}