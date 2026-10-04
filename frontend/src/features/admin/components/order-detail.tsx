'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Ban, Printer, Save, ShoppingBag, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/features/admin/components/error-state'
import { OrderInvoice } from '@/features/admin/components/order-invoice'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  ShipmentStatusBadge,
} from '@/features/admin/components/status-badge'
import { adminApi, formatAmount } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { formatPrice } from '@/lib/utils/format-price'
import type {
  AdminOrder,
  AdminOrderShippingUpdate,
  AdminOrderStatus,
  AdminPaymentStatus,
} from '@/types/admin'

const STATUS_OPTIONS: AdminOrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}

const PAYMENT_OPTIONS: AdminPaymentStatus[] = ['pending', 'paid', 'failed', 'refunded']

const PAYMENT_LABELS: Record<AdminPaymentStatus, string> = {
  pending: 'معلّق',
  paid: 'مدفوع',
  failed: 'فشل الدفع',
  refunded: 'مسترجع',
}

const PAYMENT_METHODS = [
  { value: 'cod', label: 'الدفع عند الاستلام' },
  { value: 'card', label: 'بطاقة بنكية' },
]

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
)

const PROVIDER_LABELS: Record<string, string> = {
  bosta: 'Bosta',
  aramex: 'Aramex',
  fedex: 'FedEx',
  dhl: 'DHL',
}

interface FormState {
  status: AdminOrderStatus
  paymentStatus: AdminPaymentStatus
  paymentMethod: string
  shipping: Required<AdminOrderShippingUpdate>
}

function toForm(order: AdminOrder): FormState {
  return {
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod ?? 'cod',
    shipping: {
      firstName: order.shipping?.firstName ?? '',
      lastName: order.shipping?.lastName ?? '',
      phone: order.shipping?.phone ?? '',
      address: order.shipping?.address ?? '',
      city: order.shipping?.city ?? '',
      governorate: order.shipping?.governorate ?? '',
      notes: order.shipping?.notes ?? '',
    },
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const inputClass =
  'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

export function OrderDetail({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // إعادة التحميل من معالج حدث (لا تُستدعى داخل effect لتجنّب setState المتزامن).
  const load = async () => {
    try {
      const data = await adminApi.getOrder(orderNumber)
      setOrder(data)
      setForm(toForm(data))
      setError(null)
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
        const data = await adminApi.getOrder(orderNumber)
        if (!cancelled) {
          setOrder(data)
          setForm(toForm(data))
          setError(null)
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
  }, [orderNumber])

  const retry = () => {
    setLoading(true)
    void load()
  }

  const setShipping = (field: keyof Required<AdminOrderShippingUpdate>, value: string) => {
    setForm((prev) =>
      prev ? { ...prev, shipping: { ...prev.shipping, [field]: value } } : prev
    )
  }

  const save = async (override: Partial<FormState> = {}, message = 'تم حفظ تعديلات الطلب') => {
    if (!form) return
    const next = { ...form, ...override }
    setSaving(true)
    try {
      const updated = await adminApi.updateOrder(orderNumber, {
        status: next.status,
        paymentStatus: next.paymentStatus,
        paymentMethod: next.paymentMethod,
        shipping: next.shipping,
      })
      setOrder(updated)
      setForm(toForm(updated))
      toast.success(message)
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const cancelOrder = () => {
    if (!form || form.status === 'cancelled') return
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return
    void save({ status: 'cancelled' }, 'تم إلغاء الطلب')
  }

  if (loading) {
    return <p className="text-sm text-muted">جارٍ تحميل الطلب…</p>
  }

  if (error) {
    return <ErrorState message={error} onRetry={retry} />
  }

  if (!order || !form) {
    return <p className="text-sm text-muted">لا توجد بيانات للطلب.</p>
  }

  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="رجوع إلى الطلبات">
              <Link href="/admin/orders">
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-2xl font-semibold text-plum">طلب</h1>
              <p className="font-mono text-sm text-muted" dir="ltr">
                {order.orderNumber}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            طباعة الفاتورة
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="flex items-center gap-2 font-medium text-plum">
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  المنتجات المطلوبة
                </h2>
                <span className="text-xs text-muted">{itemsCount} عنصر</span>
              </div>
              <ul className="divide-y divide-border/60">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-accent/20">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name ?? 'منتج'}
                          fill
                          unoptimized
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-muted">
                          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name ?? 'منتج'}</p>
                      {item.slug && (
                        <p className="truncate text-xs text-muted" dir="ltr">
                          {item.slug}
                        </p>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-sm text-muted">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </div>
                    <div className="w-24 whitespace-nowrap text-left font-medium">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-3 font-medium text-plum">الملخّص المالي</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">المجموع الفرعي</dt>
                  <dd>{formatAmount(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">الشحن</dt>
                  <dd>{formatAmount(order.shippingCost)}</dd>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>الخصم{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                    <dd>- {formatAmount(order.discountAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                  <dt>الإجمالي</dt>
                  <dd>{formatAmount(order.total)}</dd>
                </div>
              </dl>
            </section>

            {order.shipment && (
              <section className="rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="flex items-center gap-2 font-medium text-plum">
                    <Truck className="h-4 w-4" aria-hidden="true" />
                    تتبّع الشحنة
                  </h2>
                  {order.shipment.status && (
                    <ShipmentStatusBadge status={order.shipment.status} />
                  )}
                </div>
                <dl className="space-y-2 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">مزوّ الشحن</dt>
                    <dd className="font-medium">
                      {PROVIDER_LABELS[order.shipment.provider ?? ''] ??
                        order.shipment.provider ??
                        '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">رقم التتبّع</dt>
                    <dd className="font-mono" dir="ltr">
                      {order.shipment.trackingNumber || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">معرّف الشحنة</dt>
                    <dd className="truncate font-mono text-xs" dir="ltr">
                      {order.shipment.shipmentId || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">آخر تحديث</dt>
                    <dd>{formatDate(order.shipment.updatedAt)}</dd>
                  </div>
                </dl>
                <p className="border-t border-border px-4 py-2 text-xs text-muted">
                  الحالة تُحدَّث تلقائياً من إشعار مزوّد الشحن.
                </p>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
              <h2 className="font-medium text-plum">التحكّم بالطلب</h2>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">حالة الطلب</span>
                <select
                  className={inputClass}
                  value={form.status}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((prev) => (prev ? { ...prev, status: e.target.value as AdminOrderStatus } : prev))
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">حالة الدفع</span>
                <select
                  className={inputClass}
                  value={form.paymentStatus}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((prev) =>
                      prev ? { ...prev, paymentStatus: e.target.value as AdminPaymentStatus } : prev
                    )
                  }
                >
                  {PAYMENT_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {PAYMENT_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">طريقة الدفع</span>
                <select
                  className={inputClass}
                  value={form.paymentMethod}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((prev) => (prev ? { ...prev, paymentMethod: e.target.value } : prev))
                  }
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-2 pt-1">
                <Button className="w-full gap-2" disabled={saving} onClick={() => void save()}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-danger"
                  disabled={saving || form.status === 'cancelled'}
                  onClick={cancelOrder}
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  إلغاء الطلب
                </Button>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
              <h2 className="font-medium text-plum">بيانات العميل والشحن</h2>
              {order.email && (
                <p className="text-xs text-muted" dir="ltr">
                  {order.email}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">الاسم الأول</span>
                  <input
                    className={inputClass}
                    value={form.shipping.firstName}
                    disabled={saving}
                    onChange={(e) => setShipping('firstName', e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">اسم العائلة</span>
                  <input
                    className={inputClass}
                    value={form.shipping.lastName}
                    disabled={saving}
                    onChange={(e) => setShipping('lastName', e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">الهاتف</span>
                <input
                  className={inputClass}
                  dir="ltr"
                  value={form.shipping.phone}
                  disabled={saving}
                  onChange={(e) => setShipping('phone', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">العنوان</span>
                <input
                  className={inputClass}
                  value={form.shipping.address}
                  disabled={saving}
                  onChange={(e) => setShipping('address', e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">المدينة</span>
                  <input
                    className={inputClass}
                    value={form.shipping.city}
                    disabled={saving}
                    onChange={(e) => setShipping('city', e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">المحافظة</span>
                  <input
                    className={inputClass}
                    value={form.shipping.governorate}
                    disabled={saving}
                    onChange={(e) => setShipping('governorate', e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">ملاحظات</span>
                <textarea
                  className="min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  value={form.shipping.notes}
                  disabled={saving}
                  onChange={(e) => setShipping('notes', e.target.value)}
                />
              </label>
            </section>

            <section className="rounded-xl border border-border bg-surface p-4 text-sm">
              <h2 className="mb-3 font-medium text-plum">معلومات إضافية</h2>
              <div className="space-y-1">
                <p>
                  <span className="text-muted">تاريخ الإنشاء: </span>
                  {formatDate(order.createdAt)}
                </p>
                <p>
                  <span className="text-muted">آخر تحديث: </span>
                  {formatDate(order.updatedAt)}
                </p>
                <p>
                  <span className="text-muted">طريقة الدفع: </span>
                  {PAYMENT_METHOD_LABELS[order.paymentMethod ?? ''] ?? order.paymentMethod ?? '—'}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="hidden print:block">
        <OrderInvoice order={order} />
      </div>
    </div>
  )
}
