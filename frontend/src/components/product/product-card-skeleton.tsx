import { Skeleton } from '@/components/ui/skeleton'

/** هيكل تحميل لبطاقة منتج */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      <Skeleton className="mx-3 mt-3 aspect-[16/9] rounded-md" />
      <div className="space-y-1.5 p-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}