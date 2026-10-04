'use client'

import { useEffect, useState } from 'react'
import { Activity, RefreshCw, ShoppingCart, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi, formatAmount } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import type {
  AdminAnalyticsOverview,
  AdminCheckoutSession,
  AdminFunnel,
  AdminFunnelStep,
  AdminJourneyCart,
  AdminJourneyCartStatus,
  AdminTimelineEvent,
  AdminVisitor,
} from '@/types/admin'

const RANGES = [
  { days: 7, label: '7 أيام' },
  { days: 30, label: '30 يوماً' },
  { days: 90, label: '90 يوماً' },
]

const EVENT_LABELS: Record<string, string> = {
  page_view: 'مشاهدة صفحة',
  product_view: 'مشاهدة منتج',
  add_to_cart: 'إضافة للسلة',
  remove_from_cart: 'إزالة من السلة',
  update_cart_quantity: 'تعديل الكمية',
  view_cart: 'عرض السلة',
  begin_checkout: 'بدء الدفع',
  add_contact_info: 'بيانات التواصل',
  add_shipping_info: 'بيانات الشحن',
  select_shipping_method: 'اختيار الشحن',
  add_payment_info: 'بيانات الدفع',
  purchase: 'شراء',
  checkout_error: 'خطأ في الدفع',
  coupon_applied: 'تطبيق كوبون',
  coupon_removed: 'إزالة كوبون',
  coupon_error: 'كوبون غير صالح',
  login: 'تسجيل دخول',
  sign_up: 'إنشاء حساب',
  logout: 'تسجيل خروج',
  wishlist_add: 'إضافة للمفضلة',
  wishlist_remove: 'إزالة من المفضلة',
}

const CART_STATUS_LABELS: Record<AdminJourneyCartStatus, string> = {
  ACTIVE: 'نشطة',
  ABANDONED: 'متروكة',
  RECOVERED: 'مستعادة',
  CONVERTED: 'محوّلة',
  EXPIRED: 'منتهية',
}

const CART_STATUS_CLASSES: Record<AdminJourneyCartStatus, string> = {
  ACTIVE: 'bg-sky-500/10 text-sky-700',
  ABANDONED: 'bg-rose-500/10 text-rose-700',
  RECOVERED: 'bg-emerald-500/10 text-emerald-700',
  CONVERTED: 'bg-emerald-500/15 text-emerald-800',
  EXPIRED: 'bg-muted/20 text-muted',
}

const CHECKOUT_STATUS_LABELS: Record<AdminCheckoutSession['status'], string> = {
  IN_PROGRESS: 'قيد التنفيذ',
  COMPLETED: 'مكتمل',
  FAILED: 'فشل',
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ar-EG', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface TimelineView {
  title: string
  events: AdminTimelineEvent[]
  carts: AdminJourneyCart[]
  checkoutSessions: AdminCheckoutSession[]
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-plum">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function FunnelChart({ steps }: { steps: AdminFunnelStep[] }) {
  const max = Math.max(...steps.map((step) => step.count), 1)
  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const width = step.count > 0 ? Math.max((step.count / max) * 100, 6) : 0
        return (
          <div key={step.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-charcoal">{step.label}</span>
              <span className="text-muted">
                {step.count} · {step.rate}%
              </span>
            </div>
            <div className="h-7 overflow-hidden rounded-md bg-accent/40">
              <div
                className="h-full rounded-md bg-plum/80 transition-all"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [refreshKey, setRefreshKey] = useState(0)
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null)
  const [funnel, setFunnel] = useState<AdminFunnel | null>(null)
  const [carts, setCarts] = useState<AdminJourneyCart[]>([])
  const [visitors, setVisitors] = useState<AdminVisitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [timeline, setTimeline] = useState<TimelineView | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [overviewData, funnelData, cartData, visitorData] = await Promise.all([
          adminApi.analyticsOverview(days),
          adminApi.analyticsFunnel(days),
          adminApi.analyticsAbandonedCarts(days),
          adminApi.analyticsVisitors(days),
        ])
        if (cancelled) return
        setOverview(overviewData)
        setFunnel(funnelData)
        setCarts(cartData)
        setVisitors(visitorData)
      } catch (err) {
        if (!cancelled) setError(friendlyMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [days, refreshKey])

  const handleRunAbandonment = async () => {
    setRunning(true)
    try {
      const result = await adminApi.runAbandonment()
      toast.success(`تم فحص السلال — ${result.abandoned} سلة متروكة`)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setRunning(false)
    }
  }

  const openVisitorTimeline = async (visitor: AdminVisitor) => {
    setTimelineLoading(true)
    try {
      const data = await adminApi.visitorTimeline(visitor.id)
      setTimeline({
        title: visitor.customerName ?? visitor.customerEmail ?? `زائر ${visitor.id.slice(0, 8)}`,
        events: data.events,
        carts: data.carts,
        checkoutSessions: data.checkoutSessions,
      })
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setTimelineLoading(false)
    }
  }

  const openCartTimeline = async (cart: AdminJourneyCart) => {
    setTimelineLoading(true)
    try {
      if (cart.customerId) {
        const data = await adminApi.customerTimeline(cart.customerId)
        const customerName = [data.customer?.firstName, data.customer?.lastName]
          .filter(Boolean)
          .join(' ')
        setTimeline({
          title:
            cart.customerName || customerName || data.customer?.email || cart.customerEmail || 'عميل',
          events: data.events,
          carts: data.carts,
          checkoutSessions: data.checkoutSessions,
        })
      } else if (cart.visitorId) {
        const data = await adminApi.visitorTimeline(cart.visitorId)
        setTimeline({
          title:
            cart.customerName ?? cart.customerEmail ?? `زائر ${cart.visitorId.slice(0, 8)}`,
          events: data.events,
          carts: data.carts,
          checkoutSessions: data.checkoutSessions,
        })
      }
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setTimelineLoading(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => setRefreshKey((k) => k + 1)} />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-plum">تحليلات الرحلة</h1>
          <p className="mt-1 text-sm text-muted">حركة الزوّار ومسار التحويل والسلال المتروكة.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-border p-0.5">
            {RANGES.map((range) => (
              <button
                key={range.days}
                type="button"
                onClick={() => setDays(range.days)}
                className={cn(
                  'rounded px-3 py-1.5 text-sm transition-colors',
                  days === range.days ? 'bg-plum text-cream' : 'text-charcoal hover:bg-accent/60'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleRunAbandonment} disabled={running}>
            <RefreshCw className={cn('h-4 w-4', running && 'animate-spin')} aria-hidden="true" />
            فحص السلال المتروكة
          </Button>
        </div>
      </div>

      {loading || !overview || !funnel ? (
        <p className="text-sm text-muted">جارٍ تحميل التحليلات…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            <MetricCard label="الزوّار" value={String(overview.visitors)} hint={`${overview.sessions} جلسة`} />
            <MetricCard label="مشاهدات الصفحات" value={String(overview.pageViews)} hint={`${overview.avgEventsPerSession} حدث/جلسة`} />
            <MetricCard label="مشاهدات المنتجات" value={String(overview.productViews)} />
            <MetricCard label="إضافات للسلة" value={String(overview.addToCarts)} />
            <MetricCard label="بدء الدفع" value={String(overview.checkouts)} />
            <MetricCard label="عمليات الشراء" value={String(overview.purchases)} hint={`تحويل ${overview.conversionRate}%`} />
            <MetricCard label="الإيرادات" value={formatAmount(overview.revenue)} />
            <MetricCard label="معدل الارتداد" value={`${overview.bounceRate}%`} />
            <MetricCard
              label="سلال متروكة"
              value={String(overview.abandonedCarts)}
              hint={formatAmount(overview.abandonedValue)}
            />
            <MetricCard label="سلال مستعادة" value={String(overview.recoveredCarts)} />
            <MetricCard label="سلال محوّلة" value={String(overview.convertedCarts)} />
            <MetricCard label="عملاء محتملون" value={String(overview.leads)} hint="هويات مُلتقطة" />
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-plum">
              <Activity className="h-4 w-4" aria-hidden="true" />
              مسار التحويل
            </h2>
            <FunnelChart steps={funnel.steps} />
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-plum">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              السلال المتروكة والمستعادة
            </h2>
            {carts.length === 0 ? (
              <p className="text-sm text-muted">لا توجد سلال في هذه المدة.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-right text-xs text-muted">
                      <th className="pb-2 font-medium">العميل / الزائر</th>
                      <th className="pb-2 font-medium">الحالة</th>
                      <th className="pb-2 font-medium">العناصر</th>
                      <th className="pb-2 font-medium">القيمة</th>
                      <th className="pb-2 font-medium">آخر نشاط</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {carts.map((cart) => (
                      <tr key={cart.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 text-charcoal">
                          <div>
                            {cart.customerName ??
                              cart.customerEmail ??
                              (cart.visitorId ? `زائر ${cart.visitorId.slice(0, 8)}` : '—')}
                          </div>
                          {cart.primaryPhone && (
                            <div className="text-xs text-muted" dir="ltr">
                              {cart.primaryPhone}
                              {cart.secondaryPhone ? ` · ${cart.secondaryPhone}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-xs font-medium',
                              CART_STATUS_CLASSES[cart.status]
                            )}
                          >
                            {CART_STATUS_LABELS[cart.status]}
                          </span>
                        </td>
                        <td className="py-2.5 text-muted">{cart.itemsCount}</td>
                        <td className="py-2.5 text-muted">{formatAmount(cart.subtotal)}</td>
                        <td className="py-2.5 text-muted">{formatDate(cart.lastActivityAt)}</td>
                        <td className="py-2.5 text-left">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={timelineLoading}
                            onClick={() => openCartTimeline(cart)}
                          >
                            الخط الزمني
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-plum">
              <Users className="h-4 w-4" aria-hidden="true" />
              الزوّار النشطون
            </h2>
            {visitors.length === 0 ? (
              <p className="text-sm text-muted">لا يوجد زوّار في هذه المدة.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-right text-xs text-muted">
                      <th className="pb-2 font-medium">الهوية</th>
                      <th className="pb-2 font-medium">الجهاز</th>
                      <th className="pb-2 font-medium">الجلسات</th>
                      <th className="pb-2 font-medium">الأحداث</th>
                      <th className="pb-2 font-medium">المصدر</th>
                      <th className="pb-2 font-medium">آخر ظهور</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((visitor) => (
                      <tr key={visitor.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 text-charcoal">
                          <div>
                            {visitor.customerName ?? visitor.customerEmail ?? `زائر ${visitor.id.slice(0, 8)}`}
                          </div>
                          {visitor.primaryPhone && (
                            <div className="text-xs text-muted" dir="ltr">
                              {visitor.primaryPhone}
                              {visitor.secondaryPhone ? ` · ${visitor.secondaryPhone}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 text-muted">{visitor.deviceType ?? '—'}</td>
                        <td className="py-2.5 text-muted">{visitor.sessionsCount}</td>
                        <td className="py-2.5 text-muted">{visitor.eventsCount}</td>
                        <td className="py-2.5 text-muted">
                          {visitor.utmSource ?? visitor.firstReferrer ?? 'مباشر'}
                        </td>
                        <td className="py-2.5 text-muted">{formatDate(visitor.lastSeenAt)}</td>
                        <td className="py-2.5 text-left">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={timelineLoading}
                            onClick={() => openVisitorTimeline(visitor)}
                          >
                            الخط الزمني
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {timeline && (
        <section className="rounded-xl border border-plum/30 bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-plum">
              الخط الزمني — {timeline.title}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setTimeline(null)}>
              <X className="h-4 w-4" aria-hidden="true" />
              إغلاق
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h3 className="mb-2 text-sm font-medium text-charcoal">الأحداث ({timeline.events.length})</h3>
              {timeline.events.length === 0 ? (
                <p className="text-sm text-muted">لا توجد أحداث.</p>
              ) : (
                <ol className="space-y-2">
                  {timeline.events.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {EVENT_LABELS[event.name] ?? event.name}
                        </p>
                        {event.path && <p className="text-xs text-muted">{event.path}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-muted">{formatDate(event.timestamp)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium text-charcoal">
                  السلال ({timeline.carts.length})
                </h3>
                {timeline.carts.length === 0 ? (
                  <p className="text-sm text-muted">لا توجد سلال.</p>
                ) : (
                  <ul className="space-y-2">
                    {timeline.carts.map((cart) => (
                      <li key={cart.id} className="rounded-md border border-border/60 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs', CART_STATUS_CLASSES[cart.status])}>
                            {CART_STATUS_LABELS[cart.status]}
                          </span>
                          <span className="text-muted">{formatAmount(cart.subtotal)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted">{cart.itemsCount} عنصر</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-charcoal">
                  جلسات الدفع ({timeline.checkoutSessions.length})
                </h3>
                {timeline.checkoutSessions.length === 0 ? (
                  <p className="text-sm text-muted">لا توجد جلسات دفع.</p>
                ) : (
                  <ul className="space-y-2">
                    {timeline.checkoutSessions.map((checkout) => (
                      <li key={checkout.id} className="rounded-md border border-border/60 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal">
                            {CHECKOUT_STATUS_LABELS[checkout.status]}
                          </span>
                          <span className="text-muted">{formatAmount(checkout.total)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          آخر خطوة: {checkout.step ?? '—'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
