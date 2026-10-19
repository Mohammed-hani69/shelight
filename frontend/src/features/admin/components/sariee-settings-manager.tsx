'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { LoaderCircle, RefreshCw, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi, formatAmount, type SarieeOrder, type SarieeSettings } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'

const EMPTY_SETTINGS: SarieeSettings = {
  provider: 'sariee',
  enabled: false,
  apiConfigured: false,
  apiKeyMasked: '',
  pickupLocationId: '',
  defaultWeightKg: 1,
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ar-EG')
}

export function SarieeSettingsManager() {
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [apiKey, setApiKey] = useState('')
  const [orders, setOrders] = useState<SarieeOrder[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activatingOrderNumber, setActivatingOrderNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextPage: number, quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [nextSettings, result] = await Promise.all([
        adminApi.getSarieeSettings(),
        adminApi.listSarieeOrders(nextPage),
      ])
      setSettings(nextSettings)
      setOrders(result.items)
      setPage(result.meta?.page ?? nextPage)
      setTotalPages(result.meta?.totalPages ?? 1)
    } catch (err) {
      const message = friendlyMessage(err)
      setError(message)
      if (quiet) toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Initial server fetch; later refreshes are triggered by user actions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1)
  }, [load])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const updated = await adminApi.saveSarieeSettings({
        apiKey: apiKey.trim() || undefined,
        pickupLocationId: settings.pickupLocationId.trim(),
        defaultWeightKg: settings.defaultWeightKg,
        enabled: settings.enabled,
      })
      setSettings(updated)
      setApiKey('')
      toast.success('تم حفظ إعدادات سريع')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const activateShipment = async (order: SarieeOrder) => {
    setActivatingOrderNumber(order.orderNumber)
    try {
      const shipment = await adminApi.activateSarieeOrder(order.orderNumber)
      setOrders((current) =>
        current.map((item) =>
          item.orderNumber === order.orderNumber
            ? {
                ...item,
                sarieeOrderId: shipment.sarieeOrderId,
                trackingNumber: shipment.trackingNumber ?? null,
                status: shipment.status,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      )
      toast.success('تم تفعيل الشحنة في سريع')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setActivatingOrderNumber(null)
    }
  }

  if (loading && orders.length === 0 && !error) {
    return <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">جارٍ تحميل إعدادات سريع…</p>
  }

  return (
    <div className="space-y-6">
      {error && <ErrorState message={error} onRetry={() => void load(page)} />}

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Truck className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-display text-xl font-semibold text-plum">إعدادات الربط مع سريع</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              احفظ مفتاح API وPickup Location ID لإرسال الطلبات كمسودات ثم تفعيلها.
              المفتاح محفوظ مشفراً ولا يُعرض كاملاً بعد الحفظ.
            </p>
            {settings.apiConfigured && (
              <p className="mt-2 text-xs text-muted" dir="ltr">
                المفتاح الحالي: {settings.apiKeyMasked}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sariee-api-key">
              {settings.apiConfigured ? 'استبدال مفتاح API (اتركه فارغاً للاحتفاظ بالحالي)' : 'مفتاح API'}
            </Label>
            <Input
              id="sariee-api-key"
              type="password"
              autoComplete="new-password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={settings.apiConfigured ? '••••••••••••' : 'أدخل المفتاح الجديد'}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sariee-pickup-id">Pickup Location ID</Label>
            <Input
              id="sariee-pickup-id"
              value={settings.pickupLocationId}
              onChange={(event) => setSettings((current) => ({ ...current, pickupLocationId: event.target.value }))}
              dir="ltr"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sariee-weight">الوزن الافتراضي (كجم)</Label>
            <Input
              id="sariee-weight"
              type="number"
              min="0.01"
              max="1000"
              step="0.01"
              value={settings.defaultWeightKg}
              onChange={(event) => setSettings((current) => ({ ...current, defaultWeightKg: Number(event.target.value) }))}
              dir="ltr"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            تفعيل الربط مع سريع
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
            </Button>
            <Button type="button" variant="outline" disabled={refreshing} onClick={() => void load(page, true)}>
              <RefreshCw className={`ml-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              تحديث
            </Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-medium text-plum">طلبات سريع المسجلة</h2>
          <span className="text-sm text-muted">{orders.length} طلب</span>
        </div>
        {orders.length === 0 ? (
          <p className="p-5 text-sm text-muted">لا توجد طلبات مرتبطة بسريع حتى الآن.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-right text-sm">
              <thead className="bg-accent/20 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">رقم الطلب</th>
                  <th className="px-4 py-3 font-medium">رقم شحنة سريع</th>
                  <th className="px-4 py-3 font-medium">التتبع</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">الإجمالي</th>
                  <th className="px-4 py-3 font-medium">آخر تحديث</th>
                  <th className="px-4 py-3 font-medium">إجراء الشحنة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.orderNumber}>
                    <td className="px-4 py-3">
                      <Link className="font-medium text-primary hover:underline" href={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono" dir="ltr">{order.sarieeOrderId || '—'}</td>
                    <td className="px-4 py-3 font-mono" dir="ltr">{order.trackingNumber || '—'}</td>
                    <td className="px-4 py-3">{order.status || '—'}</td>
                    <td className="px-4 py-3">{formatAmount(order.total)}</td>
                    <td className="px-4 py-3">{formatDate(order.updatedAt)}</td>
                    <td className="px-4 py-3">
                      {order.status === 'draft' ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={activatingOrderNumber !== null}
                          onClick={() => void activateShipment(order)}
                        >
                          {activatingOrderNumber === order.orderNumber ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Truck className="h-4 w-4" aria-hidden="true" />
                          )}
                          {activatingOrderNumber === order.orderNumber ? 'جارٍ التفعيل…' : 'تفعيل الشحنة'}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>
            السابق
          </Button>
          <span className="text-muted">صفحة {page} من {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => void load(page + 1)}>
            التالي
          </Button>
        </div>
      </section>
    </div>
  )
}
