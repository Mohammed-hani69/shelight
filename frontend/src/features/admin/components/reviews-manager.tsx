'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, BarChart3, CheckCircle2, Eye, EyeOff, Loader2, MessageSquareText, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi, type AdminReview, type ReviewOverview } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import type { BackendMeta } from '@/lib/api/backend-mappers'

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ReviewsManager() {
  const [overview, setOverview] = useState<ReviewOverview | null>(null)
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [meta, setMeta] = useState<BackendMeta | null>(null)
  const [filter, setFilter] = useState<'all' | 'published' | 'hidden'>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async (nextPage = page, nextFilter = filter) => {
    setLoading(true)
    setError(null)
    try {
      const [summary, result] = await Promise.all([
        adminApi.reviewOverview(),
        adminApi.listReviews({
          page: nextPage,
          published: nextFilter === 'all' ? null : nextFilter === 'published',
        }),
      ])
      setOverview(summary)
      setReviews(result.items)
      setMeta(result.meta ?? null)
      setPage(nextPage)
      setFilter(nextFilter)
    } catch (err) {
      setError(friendlyMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1, 'all')
    // Initial request only. Filters and pagination invoke load directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const moderate = async (review: AdminReview) => {
    setBusyId(review.id)
    try {
      await adminApi.moderateReview(review.id, !review.isPublished)
      toast.success(review.isPublished ? 'تم إخفاء التقييم' : 'تم نشر التقييم')
      await load(page, filter)
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorState message={error} onRetry={() => void load(page, filter)} />}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="كل التقييمات" value={overview?.totalReviews ?? 0} icon={MessageSquareText} />
        <Metric label="متوسط التقييم المنشور" value={`${(overview?.averageRating ?? 0).toFixed(1)} / 5`} icon={Star} />
        <Metric label="تقييمات منشورة" value={overview?.publishedReviews ?? 0} icon={CheckCircle2} />
        <Metric label="مخفية للمراجعة" value={overview?.pendingReviews ?? 0} icon={EyeOff} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-plum">توزيع التقييمات</h2>
          </div>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = overview?.distribution[String(stars)] ?? 0
              const total = overview?.publishedReviews ?? 0
              const width = total ? (count / total) * 100 : 0
              return (
                <div key={stars} className="flex items-center gap-3 text-sm">
                  <span className="flex w-12 items-center gap-1 text-muted"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{stars}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                  <span className="w-8 text-left text-xs text-muted">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-plum">المنتجات الأعلى تقييمًا</h2>
          {!overview?.products.length ? (
            <p className="py-8 text-center text-sm text-muted">لا توجد تقييمات منشورة كافية للتحليل.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-right text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="pb-2 font-medium">المنتج</th>
                    <th className="pb-2 font-medium">المتوسط</th>
                    <th className="pb-2 font-medium">عدد التقييمات</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.products.slice(0, 5).map((product) => (
                    <tr key={product.productId} className="border-t border-border">
                      <td className="py-2.5"><Link href={`/products/${product.slug}`} className="text-primary hover:underline">{product.name}</Link></td>
                      <td className="py-2.5"><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{product.averageRating.toFixed(1)}</span></td>
                      <td className="py-2.5 text-muted">{product.reviewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold text-plum">المنتجات التي تحتاج اهتمامًا</h2>
          {!overview?.products.length ? (
            <p className="py-6 text-center text-sm text-muted">لا توجد بيانات تقييمات بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-right text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="pb-2 font-medium">المنتج</th>
                    <th className="pb-2 font-medium">المتوسط</th>
                    <th className="pb-2 font-medium">عدد التقييمات</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.products.slice(-5).reverse().map((product) => (
                    <tr key={product.productId} className="border-t border-border">
                      <td className="py-2.5"><Link href={`/products/${product.slug}`} className="text-primary hover:underline">{product.name}</Link></td>
                      <td className="py-2.5"><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{product.averageRating.toFixed(1)}</span></td>
                      <td className="py-2.5 text-muted">{product.reviewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-plum">تقييمات العملاء</h2>
            <p className="mt-1 text-xs text-muted">إظهار أو إخفاء التقييمات من صفحة المنتج.</p>
          </div>
          <select
            value={filter}
            aria-label="فلترة التقييمات حسب حالة النشر"
            onChange={(event) => void load(1, event.target.value as typeof filter)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="all">كل التقييمات</option>
            <option value="published">منشورة</option>
            <option value="hidden">مخفية</option>
          </select>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-muted">جارٍ تحميل التقييمات…</p>
        ) : reviews.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">لا توجد تقييمات في هذا العرض.</p>
        ) : (
          <ul className="divide-y divide-border">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-plum">{review.authorName}</strong>
                    {review.isVerified && <BadgeCheck className="h-4 w-4 text-success" aria-label="مشتري موثّق" />}
                    <span className="flex items-center gap-0.5" aria-label={`${review.rating} من 5 نجوم`}>
                      {Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn('h-3.5 w-3.5', index < review.rating ? 'fill-warning text-warning' : 'text-muted/30')} />)}
                    </span>
                    <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
                  </div>
                  <Link href={`/products/${review.productSlug}`} className="mt-1 inline-block text-xs text-primary hover:underline">{review.productName}</Link>
                  {review.title && <h3 className="mt-1 text-sm font-medium text-charcoal">{review.title}</h3>}
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{review.body}</p>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={busyId === review.id} onClick={() => void moderate(review)}>
                  {busyId === review.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : review.isPublished ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  {review.isPublished ? 'إخفاء' : 'نشر'}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <span className="text-xs text-muted">صفحة {meta.page} من {meta.totalPages} · {meta.total} تقييم</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => void load(page - 1, filter)}>السابق</Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages || loading} onClick={() => void load(page + 1, filter)}>التالي</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Star }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted"><Icon className="h-4 w-4" aria-hidden="true" /><span className="text-xs">{label}</span></div>
      <p className="mt-3 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  )
}
