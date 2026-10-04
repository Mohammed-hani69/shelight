'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi, formatAmount } from '@/features/admin/services/admin-api'
import { OrderStatusBadge } from '@/features/admin/components/status-badge'
import { friendlyMessage } from '@/lib/api/errors'
import type { AdminOrder, AdminOrderStatus, AdminPaymentStatus } from '@/types/admin'
import type { BackendMeta } from '@/lib/api/backend-mappers'

const STATUS_OPTIONS: AdminOrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYMENT_OPTIONS: AdminPaymentStatus[] = ['pending', 'paid', 'failed', 'refunded']

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}

const PAYMENT_LABELS: Record<AdminPaymentStatus, string> = {
  pending: 'معلّق',
  paid: 'مدفوع',
  failed: 'فشل الدفع',
  refunded: 'مسترجع',
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function OrdersTable() {
  const [items, setItems] = useState<AdminOrder[]>([])
  const [meta, setMeta] = useState<BackendMeta | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const load = async (status = statusFilter) => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.listOrders(status || undefined)
      setItems(res.items)
      setMeta(res.meta ?? null)
    } catch (err) {
      setError(friendlyMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function initial() {
      try {
        const res = await adminApi.listOrders()
        if (!cancelled) {
          setItems(res.items)
          setMeta(res.meta ?? null)
        }
      } catch (err) {
        if (!cancelled) setError(friendlyMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void initial()
    return () => {
      cancelled = true
    }
  }, [])

  const patch = async (order: AdminOrder, payload: { status?: AdminOrderStatus; paymentStatus?: AdminPaymentStatus }) => {
    setUpdating(true)
    try {
      await adminApi.updateOrder(order.orderNumber, payload)
      setItems((prev) =>
        prev.map((item) => (item.id === order.id ? { ...item, ...payload } : item))
      )
      toast.success('تم تحديث الطلب')
    } catch (err) {
      toast.error(friendlyMessage(err))
      void load()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm text-muted" htmlFor="status-filter">
          فلترة بالحالة:
        </label>
        <select
          id="status-filter"
          className="h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            void load(e.target.value)
          }}
        >
          <option value="">كل الحالات</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <p className="text-sm text-muted">جارٍ تحميل الطلبات…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <Package className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="text-sm text-muted">لا توجد طلبات هنا.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-3 font-medium">رقم الطلب</th>
                  <th className="px-4 py-3 font-medium">التاريخ</th>
                  <th className="px-4 py-3 font-medium">العميل</th>
                  <th className="px-4 py-3 font-medium">العناصر</th>
                  <th className="px-4 py-3 font-medium">الإجمالي</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">الدفع</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((order) => {
                  const customerName = order.shipping
                    ? [order.shipping.firstName, order.shipping.lastName].filter(Boolean).join(' ') || order.shipping.phone
                    : order.orderNumber
                  return (
                    <tr key={order.id} className="border-b border-border/60 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 font-medium" dir="ltr">
                        <Link
                          href={`/admin/orders/${order.orderNumber}`}
                          className="text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{customerName}</p>
                        <p className="text-xs text-muted" dir="ltr">
                          {order.shipping?.phone}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} عنصر
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatAmount(order.total)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={order.status} />
                          <select
                            aria-label={`تغيير حالة ${order.orderNumber}`}
                            className="h-8 rounded-md border border-border bg-surface px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            disabled={updating}
                            value={order.status}
                            onChange={(e) => void patch(order, { status: e.target.value as AdminOrderStatus })}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">{PAYMENT_LABELS[order.paymentStatus]}</span>
                          <select
                            aria-label={`تغيير حالة الدفع ${order.orderNumber}`}
                            className="h-8 rounded-md border border-border bg-surface px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            disabled={updating}
                            value={order.paymentStatus}
                            onChange={(e) =>
                              void patch(order, { paymentStatus: e.target.value as AdminPaymentStatus })
                            }
                          >
                            {PAYMENT_OPTIONS.map((payment) => (
                              <option key={payment} value={payment}>
                                {PAYMENT_LABELS[payment]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <Link href={`/admin/orders/${order.orderNumber}`}>
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            التفاصيل
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <p className="border-t border-border px-4 py-3 text-xs text-muted">
              صفحة {meta.page} من {meta.totalPages}
            </p>
          )}
        </div>
      )}
    </div>
  )
}