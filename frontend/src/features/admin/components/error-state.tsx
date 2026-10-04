'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

/** حالة خطأ عامة في جداول وتقارير اللوحة. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 px-6 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  )
}