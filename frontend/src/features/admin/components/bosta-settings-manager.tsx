'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Link2,
  Link2Off,
  Package,
  RefreshCw,
  Truck,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi, formatAmount, type BostaOverview } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'

const SHIPPING_STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار الاستلام',
  picked_up: 'استلمتها بوسطة',
  out_for_delivery: 'خرجت للتوصيل',
  delivered: 'تم التسليم',
  exception: 'تحتاج متابعة',
  failed: 'تعذر التسليم',
  returning: 'مرتجعة',
  canceled: 'ملغاة',
  terminated: 'منتهية من Bosta',
  awaiting_action: 'بانتظار إجراء منك',
  lost: 'مفقودة',
  damaged: 'تالفة',
}

const STATUS_OPTIONS = [
  ['pending', 'بانتظار الاستلام'],
  ['picked_up', 'استلمتها بوسطة'],
  ['out_for_delivery', 'خرجت للتوصيل'],
  ['delivered', 'تم التسليم'],
  ['exception', 'تحتاج متابعة'],
  ['returning', 'مرتجعة'],
  ['awaiting_action', 'بانتظار إجراء منك'],
  ['canceled', 'ملغاة'],
] as const

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function statusStyle(status?: string | null): string {
  if (status === 'delivered') return 'bg-emerald-100 text-emerald-800'
  if (status === 'out_for_delivery' || status === 'picked_up') return 'bg-sky-100 text-sky-800'
  if (status === 'exception' || status === 'failed' || status === 'lost' || status === 'damaged') {
    return 'bg-rose-100 text-rose-800'
  }
  if (status === 'returning' || status === 'canceled' || status === 'terminated' || status === 'awaiting_action') return 'bg-amber-100 text-amber-800'
  return 'bg-muted/60 text-charcoal'
}

function outcomeLabel(outcome: string): string {
  if (outcome === 'processed') return 'تمت المعالجة'
  if (outcome === 'unknown_shipment') return 'شحنة غير مسجلة'
  if (outcome === 'unknown_status') return 'حالة غير معروفة'
  if (outcome === 'duplicate') return 'إشعار مكرر'
  return 'تعذر المعالجة'
}

export function BostaSettingsManager() {
  const [apiKey, setApiKey] = useState('')
  const [apiConfigured, setApiConfigured] = useState(false)
  const [overview, setOverview] = useState<BostaOverview | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (nextPage = page, status = statusFilter, quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [settings, data] = await Promise.all([
        adminApi.getBostaSettings(),
        adminApi.getBostaOverview(nextPage, status || undefined),
      ])
      setApiConfigured(Boolean(settings.apiConfigured))
      setOverview(data)
      setPage(nextPage)
    } catch (err) {
      const message = friendlyMessage(err)
      setError(message)
      if (quiet) toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load(1, '')
    // Initial load only; filter and pagination changes call load directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveApiKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!apiConfigured && !apiKey.trim()) {
      toast.error('أدخل مفتاح API الخاص بحساب Bosta.')
      return
    }
    setSaving(true)
    try {
      await adminApi.saveBostaSettings({
        enabled: true,
        environment: 'production',
        apiKey: apiKey.trim() || undefined,
      })
      setApiKey('')
      toast.success('تم حفظ المفتاح وتفعيل تكامل Bosta')
      await load(1, statusFilter, true)
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleIntegration = async () => {
    if (!overview) return
    try {
      if (overview.connection.enabled) {
        await adminApi.disableBostaIntegration()
        toast.success('تم إيقاف تكامل Bosta')
      } else {
        await adminApi.enableBostaIntegration()
        toast.success('تم تفعيل تكامل Bosta')
      }
      await load(page, statusFilter, true)
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  const connection = overview?.connection
  const isReady = Boolean(
    connection?.enabled && connection.apiConfigured && connection.apiUrlConfigured,
  )

  if (loading && !overview) {
    return <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">جارٍ تحميل بيانات Bosta…</div>
  }

  return (
    <div className="space-y-6">
      {error && <ErrorState message={error} onRetry={() => void load(page, statusFilter)} />}

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {isReady ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Link2Off className="h-5 w-5 text-amber-600" aria-hidden="true" />
              )}
              <h2 className="font-display text-xl font-semibold text-plum">
                {isReady ? 'إعداد الربط مكتمل' : 'إعداد ربط Bosta'}
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              أدخل مفتاح API مرة واحدة. عنوان API وسر استقبال تحديثات الشحن يُضبطان على الخادم، ولا نعرض الأسرار هنا.
            </p>
            <p className="mt-1 text-xs text-muted">الحالة تؤكد اكتمال الإعداد، ولا تمثل اختبار اتصال مباشر بخوادم Bosta.</p>
          </div>
          {overview && (
            <Button type="button" variant="outline" onClick={() => void toggleIntegration()}>
              {overview.connection.enabled ? 'إيقاف الربط' : 'تفعيل الربط'}
            </Button>
          )}
        </div>

        <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <ConnectionCheck label="مفتاح API محفوظ" complete={Boolean(connection?.apiConfigured)} />
          <ConnectionCheck label="عنوان API مضبوط بالخادم" complete={Boolean(connection?.apiUrlConfigured)} />
          <ConnectionCheck label="Webhook استقبال الحالات" complete={Boolean(connection?.webhookConfigured)} />
        </div>

        <form onSubmit={saveApiKey} className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="bosta-api-key">مفتاح Bosta API</Label>
            <Input
              id="bosta-api-key"
              type="password"
              autoComplete="new-password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={apiConfigured ? 'المفتاح محفوظ، أدخل قيمة جديدة للاستبدال' : 'الصق مفتاح API هنا'}
              dir="ltr"
            />
            {apiConfigured && <p className="text-xs text-muted">المفتاح مخزّن بشكل مشفّر ولا يمكن استرجاعه من الواجهة.</p>}
          </div>
          <Button type="submit" disabled={saving}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {saving ? 'جارٍ الحفظ…' : 'حفظ وتفعيل الربط'}
          </Button>
        </form>
      </section>

      <section aria-label="ملخص الشحنات" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={Package} label="إجمالي الشحنات" value={overview?.summary.shipmentCount ?? 0} />
        <SummaryCard icon={Truck} label="قيد التوصيل" value={overview?.summary.inTransitCount ?? 0} />
        <SummaryCard icon={CheckCircle2} label="تم التسليم" value={overview?.summary.deliveredCount ?? 0} />
        <SummaryCard icon={AlertTriangle} label="تحتاج متابعة" value={overview?.summary.exceptionCount ?? 0} />
        <SummaryCard
          icon={WalletCards}
          label="COD مسجل كغير مدفوع"
          value={formatAmount(overview?.summary.codAwaitingPaymentUpdate)}
          detail="حسب حالة الدفع في الطلبات"
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-plum">شحنات Bosta</h2>
            <p className="mt-1 text-xs text-muted">الحالات تصل من Webhook بوسطة وتُحدّث الطلب تلقائيًا.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="تصفية الشحنات حسب الحالة"
              value={statusFilter}
              onChange={(event) => {
                const nextStatus = event.target.value
                setStatusFilter(nextStatus)
                void load(1, nextStatus)
              }}
              className="h-10 min-w-40 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">كل الحالات</option>
              {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <Button type="button" variant="outline" size="icon" aria-label="تحديث البيانات" disabled={refreshing} onClick={() => void load(page, statusFilter, true)}>
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden="true" />
            </Button>
          </div>
        </div>

        {!overview?.shipments.length ? (
          <div className="px-4 py-12 text-center">
            <Package className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-charcoal">لا توجد شحنات Bosta مسجلة بعد</p>
            <p className="mt-1 text-xs text-muted">ستظهر الشحنة هنا بعد ربطها بطلب ووصول تحديث من Bosta.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-right text-sm">
              <thead className="bg-background text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">الطلب / التتبع</th>
                  <th className="px-4 py-3 font-medium">حالة الشحنة</th>
                  <th className="px-4 py-3 font-medium">آخر تحديث من Bosta</th>
                  <th className="px-4 py-3 font-medium">حالة الدفع</th>
                  <th className="px-4 py-3 font-medium">قيمة الطلب</th>
                  <th className="px-4 py-3 font-medium">التحديث</th>
                </tr>
              </thead>
              <tbody>
                {overview.shipments.map((shipment) => (
                  <tr key={shipment.orderNumber} className="border-t border-border/70">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${encodeURIComponent(shipment.orderNumber)}`} className="font-medium text-primary hover:underline">
                        {shipment.orderNumber}
                      </Link>
                      <p className="mt-1 text-xs text-muted" dir="ltr">{shipment.trackingNumber || shipment.shipmentId || 'لا يوجد رقم تتبع'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', statusStyle(shipment.status))}>
                        {SHIPPING_STATUS_LABELS[shipment.status ?? ''] ?? shipment.status ?? 'بانتظار الحالة'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p>{shipment.lastEvent?.stateName || '—'}</p>
                      <p className="mt-1 text-xs text-muted">{formatDate(shipment.lastEvent?.receivedAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {shipment.paymentMethod === 'cod' && shipment.paymentStatus === 'pending' ? 'COD · غير محدّث' : shipment.paymentStatus === 'paid' ? 'مدفوع' : shipment.paymentStatus}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatAmount(shipment.total)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDate(shipment.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {overview && overview.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <span className="text-muted">صفحة {page} من {overview.pagination.pages} · {overview.pagination.total} شحنة</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => void load(page - 1, statusFilter)}>السابق</Button>
              <Button variant="outline" size="sm" disabled={page >= overview.pagination.pages || loading} onClick={() => void load(page + 1, statusFilter)}>التالي</Button>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-plum">ملخص التحصيل</h2>
          </div>
          <p className="mt-3 text-2xl font-semibold text-charcoal">{formatAmount(overview?.summary.codAwaitingPaymentUpdate)}</p>
          <p className="mt-1 text-sm text-muted">قيمة طلبات COD التي سُلّمت وما زالت حالة دفعها «معلّق» في النظام.</p>
          <div className="mt-4 border-t border-border pt-3 text-sm">
            <span className="text-muted">إجمالي قيمة الطلبات المسلّمة عبر Bosta: </span>
            <span className="font-medium text-charcoal">{formatAmount(overview?.summary.deliveredOrderValue)}</span>
          </div>
          <p className="mt-3 flex gap-2 text-xs leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            هذه أرقام مشتقة من الطلبات وليست كشف مستحقات أو تحويلات مالية من Bosta. يلزم endpoint تقرير التسويات الرسمي لعرض الرصيد الفعلي.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-plum">آخر إشعارات Webhook</h2>
          </div>
          {!overview?.recentEvents.length ? (
            <p className="py-6 text-center text-sm text-muted">لم تصل إشعارات من Bosta بعد.</p>
          ) : (
            <ul className="divide-y divide-border">
              {overview.recentEvents.slice(0, 6).map((event, index) => (
                <li key={`${event.trackingNumber}-${event.receivedAt}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-charcoal" dir="ltr">{event.trackingNumber || event.shipmentId || `State ${event.stateCode ?? '—'}`}</p>
                    <p className="mt-1 truncate text-xs text-muted">{event.stateName || SHIPPING_STATUS_LABELS[event.status ?? ''] || 'تحديث حالة'} · {formatDate(event.receivedAt)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{outcomeLabel(event.outcome)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function ConnectionCheck({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2">
      <span className={cn('h-2 w-2 rounded-full', complete ? 'bg-emerald-500' : 'bg-amber-500')} />
      <span className="text-charcoal">{label}</span>
      <span className="mr-auto text-xs text-muted">{complete ? 'جاهز' : 'غير مضبوط'}</span>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  detail?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-charcoal">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-muted">{detail}</p>}
    </div>
  )
}