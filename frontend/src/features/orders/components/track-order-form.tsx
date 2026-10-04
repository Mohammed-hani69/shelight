'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { PackageSearch, CircleCheck, Circle, PackageX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { orderTrackingApi } from '@/features/orders/services/orders-api'
import { ApiError, friendlyMessage } from '@/lib/api/errors'
import { formatPrice } from '@/lib/utils/format-price'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'
import type { OrderStatus, TrackedOrder } from '@/types/order'

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

interface TrackOrderFormProps {
  initialOrderNumber?: string
  initialPhone?: string
}

/**
 * تتبّع طلب بلا حساب.
 *
 * الأمان: رقم الطلب وحده لا يكفي — الـ backend يطابقه مع الموبايل،
 * فلا يمكن لأي شخص تخمين رقم طلب ورؤية بياناته.
 */
export function TrackOrderForm({
  initialOrderNumber = '',
  initialPhone = '',
}: TrackOrderFormProps) {
  const { t } = useI18n()
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber)
  const [phone, setPhone] = useState(initialPhone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TrackedOrder | null>(null)

  const statusLabel = (status: OrderStatus) => {
    const map: Record<OrderStatus, string> = {
      pending: t.tracking.statusPending,
      confirmed: t.tracking.statusConfirmed,
      processing: t.tracking.statusProcessing,
      shipped: t.tracking.statusShipped,
      delivered: t.tracking.statusDelivered,
      cancelled: t.tracking.statusCancelled,
    }
    return map[status]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderNumber.trim() || !phone.trim()) {
      setError(t.tracking.notFound)
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const tracked = await orderTrackingApi.track(orderNumber, phone)
      setResult(tracked)
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
        setError(t.tracking.notFound)
      } else {
        setError(friendlyMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const currentStep = result ? STATUS_FLOW.indexOf(result.status) : -1
  const isCancelled = result?.status === 'cancelled'

  return (
    <div className="mx-auto max-w-2xl">
      <header className="text-center">
        <h1 className="font-display text-3xl font-semibold text-plum md:text-4xl">
          {t.tracking.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{t.tracking.subtitle}</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6 sm:grid-cols-2"
      >
        <div className="space-y-1.5">
          <Label htmlFor="order-number">{t.tracking.orderNumber}</Label>
          <Input
            id="order-number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder={t.tracking.orderNumberPlaceholder}
            dir="ltr"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order-phone">{t.tracking.phone}</Label>
          <Input
            id="order-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.tracking.phonePlaceholder}
            dir="ltr"
            autoComplete="tel"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <PackageSearch className="h-4 w-4" aria-hidden="true" />
            {loading ? t.tracking.looking : t.tracking.submit}
          </Button>
          <p className="mt-2 text-center text-xs text-muted">{t.tracking.hint}</p>
        </div>
        {error && (
          <p role="alert" className="sm:col-span-2 rounded-xl bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}
      </form>

      {result && (
        <section className="mt-8 rounded-[var(--radius-lg)] border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-xs font-medium text-primary">
                {t.tracking.resultTitle.replace('{number}', result.number)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {t.tracking.placedAt}: {formatDate(result.placedAt)}
              </p>
            </div>
            <p className="font-display text-xl font-semibold text-plum">
              {formatPrice(result.total)}
            </p>
          </div>

          <Separator className="my-5" />

          {isCancelled ? (
            <p className="flex items-center gap-2 rounded-xl bg-danger/10 p-4 text-sm font-medium text-danger">
              <PackageX className="h-5 w-5" aria-hidden="true" />
              {statusLabel('cancelled')}
            </p>
          ) : (
            <ol className="flex flex-col gap-4">
              {STATUS_FLOW.map((status, index) => {
                const reached = currentStep >= index
                return (
                  <li key={status} className="flex items-center gap-3">
                    {reached ? (
                      <CircleCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted/40" aria-hidden="true" />
                    )}
                    <span
                      className={cn(
                        'text-sm',
                        reached ? 'font-medium text-charcoal' : 'text-muted'
                      )}
                    >
                      {statusLabel(status)}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}

          <Separator className="my-5" />

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.tracking.paymentMethod}</dt>
              <dd>
                {result.paymentMethod === 'card' ? t.tracking.payCard : t.tracking.payCod}
                {' — '}
                {result.paymentStatus === 'paid' ? t.tracking.paid : t.tracking.unpaid}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.tracking.shippedTo}</dt>
              <dd>{[result.city, result.governorate].filter(Boolean).join(' — ')}</dd>
            </div>
          </dl>

          <ul className="mt-5 space-y-3">
            {result.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                  {item.image && (
                    <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <p className="flex-1 text-sm font-medium leading-tight">{item.name}</p>
                <span className="text-xs text-muted">×{item.quantity}</span>
                <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link href="/shop">{t.tracking.backToShop}</Link>
        </Button>
      </div>
    </div>
  )
}

/** يعرض التاريخ بصيغة قصيرة مقروءة، ويتحمّل القيم الفارغة أو غير الصالحة. */
function formatDate(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
