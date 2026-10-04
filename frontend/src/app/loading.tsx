import { Loader2 } from 'lucide-react'

/** حالة التحميل العامة للتطبيق */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm">جارٍ التحميل…</span>
      </div>
    </div>
  )
}