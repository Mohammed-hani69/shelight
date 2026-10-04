'use client'

import { useEffect, useState } from 'react'
import { Package, MapPin, Truck, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { ordersApi } from '@/features/orders/services/orders-api'
import type { Order, OrderStatus } from '@/types/order'
import { formatPrice } from '@/lib/utils/format-price'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/use-i18n'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

const STATUS_VARIANT: Record<OrderStatus, 'success' | 'warning' | 'default' | 'secondary' | 'outline'> = {
  pending: 'warning',
  confirmed: 'secondary',
  processing: 'secondary',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'outline',
}

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()

  useEffect(() => {
    async function loadOrders() {
      if (!USE_REMOTE_API) {
        const { mockOrders } = await import('@/mock-data/orders')
        setOrders(mockOrders)
        setLoading(false)
        return
      }
      try {
        const list = await ordersApi.list()
        setOrders(list)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    void loadOrders()
  }, [])

  if (loading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center text-sm text-muted">
        {t.account.loadingOrders}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title={t.account.noOrders}
        description={t.account.noOrdersSub}
        actionLabel={t.account.startShopping}
        actionHref="/shop"
      />
    )
  }

  const totalFor = (order: Order) =>
    order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) -
    order.discount +
    order.shipping

  return (
    <div className="space-y-5">
      {orders.map((order) => {
        const badgeVariant = STATUS_VARIANT[order.status] ?? STATUS_VARIANT.pending
        const statusLabel = t.orderStatus[order.status] ?? t.orderStatus.pending
        return (
          <article
            key={order.id}
            className="rounded-[var(--radius-lg)] border border-border bg-surface p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="font-medium text-plum">{order.number}</p>
                <p className="text-xs text-muted">
                  {t.account.placed.replace('{date}', formatDate(order.placedAt))}
                </p>
              </div>
              <Badge variant={badgeVariant}>{statusLabel}</Badge>
            </div>

            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted">{t.checkout.qty.replace('{qty}', String(item.quantity))}</p>
                  </div>
                  <span className="text-sm font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {order.shippingAddress.city}, {order.shippingAddress.address}
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  {order.status === 'delivered' ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                      {t.account.delivered}
                    </>
                  ) : order.status === 'shipped' ? (
                    <>
                      <Truck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      {t.account.onTheWay}
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                      {t.account.processing}
                    </>
                  )}
                </span>
                <span className="font-display text-lg font-semibold text-plum">
                  {formatPrice(totalFor(order))}
                </span>
              </div>
            </div>
          </article>
        )
      })}

      <p className="flex items-center justify-center gap-2 text-sm text-muted">
        <Package className="h-4 w-4 text-primary" aria-hidden="true" />
        {t.account.contactSupport}
      </p>
    </div>
  )
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}