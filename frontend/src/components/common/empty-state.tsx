'use client'

import { PackageOpen } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
  className?: string
}

/** حالة فارغة موحدة لكل الأقسام */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  const action = actionLabel ? (
    onAction ? (
      <Button variant="outline" onClick={onAction} className="mt-2">
        {actionLabel}
      </Button>
    ) : actionHref ? (
      <Button asChild variant="outline" className="mt-2">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    ) : null
  ) : null

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center ${className ?? ''}`}
    >
      <PackageOpen className="h-10 w-10 text-muted/40" aria-hidden="true" />
      <h3 className="font-display text-2xl font-semibold text-plum">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}