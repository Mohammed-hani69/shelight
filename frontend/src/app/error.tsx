'use client'

import { useState } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/use-i18n'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

/** معالجة أخطاء الصفحات بطريقة ودية مع إعادة المحاولة */
export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const { t } = useI18n()
  const [showDetails] = useState(process.env.NODE_ENV !== 'production')

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-warning" aria-hidden="true" />
      <h1 className="font-display text-3xl font-semibold text-plum">
        {t.errorPage.title}
      </h1>
      <p className="max-w-md text-sm text-muted">
        {t.errorPage.sub}
      </p>
      {showDetails && error.message && (
        <p className="max-w-md rounded-md bg-accent/30 px-4 py-2 text-xs text-muted">
          {error.message}
        </p>
      )}
      <Button onClick={reset}>
        <RefreshCw aria-hidden="true" />
        {t.errorPage.tryAgain}
      </Button>
    </div>
  )
}