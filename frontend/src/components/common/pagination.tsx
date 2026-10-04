'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

interface PaginationProps {
  current: number
  totalPages: number
  onPageChange: (page: number) => void
}

/** ترقيم بسيط مع أزرار سابقة/تالية */
export function Pagination({ current, totalPages, onPageChange }: PaginationProps) {
  const { t } = useI18n()

  if (totalPages <= 1) return null

  const pages = pageWindow(current, totalPages)

  return (
    <nav aria-label={t.a11y.pagination} className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={t.a11y.previousPage}
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-charcoal transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} className="px-1 text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={t.a11y.page.replace('{number}', String(p))}
            aria-current={p === current ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={cn(
              'h-9 w-9 rounded-full text-sm font-medium transition-colors',
              p === current
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-surface text-charcoal hover:border-primary hover:text-primary'
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        aria-label={t.a11y.nextPage}
        disabled={current >= totalPages}
        onClick={() => onPageChange(current + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-charcoal transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      </button>
    </nav>
  )
}

/** نافذة صفحات (مثلاً 1 … 3 4 5 … 12) */
function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  if (current <= 4) return [1, 2, 3, 4, 5, 'ellipsis', total]
  if (current >= total - 3) return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total]
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total]
}