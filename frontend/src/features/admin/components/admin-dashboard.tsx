'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Package,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi, formatAmount } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import type { AdminDashboardSummary } from '@/types/admin'

interface CardDef {
  key: keyof AdminDashboardSummary
  label: string
  Icon: typeof Package
  format: (value: number) => string
  accent: string
}

const CARDS: CardDef[] = [
  { key: 'revenue', label: 'إجمالي الإيرادات', Icon: Banknote, format: formatAmount, accent: 'from-emerald-500/10 text-emerald-700' },
  { key: 'ordersCount', label: 'إجمالي الطلبات', Icon: ShoppingBag, format: (v) => String(v), accent: 'from-sky-500/10 text-sky-700' },
  { key: 'pendingOrders', label: 'طلبات معلّقة', Icon: Package, format: (v) => String(v), accent: 'from-amber-500/10 text-amber-700' },
  { key: 'productsCount', label: 'المنتجات النشطة', Icon: Package, format: (v) => String(v), accent: 'from-violet-500/10 text-violet-700' },
  { key: 'lowStockCount', label: 'مخزون منخفض', Icon: AlertTriangle, format: (v) => String(v), accent: 'from-rose-500/10 text-rose-700' },
  { key: 'customersCount', label: 'العملاء', Icon: Users, format: (v) => String(v), accent: 'from-plum/10 text-plum' },
]

export function AdminDashboard() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    adminApi
      .dashboard()
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((error) => {
        if (!cancelled) setError(friendlyMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <ErrorState message={error} />
  if (loading || !summary) {
    return <p className="text-sm text-muted">جارٍ تحميل الملخص…</p>
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">نظرة عامة</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map(({ key, label, Icon, format, accent }) => (
          <div
            key={key}
            className="rounded-xl border border-border bg-surface p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{label}</p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br to-transparent ${accent}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-semibold text-charcoal">
              {format(summary[key])}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}