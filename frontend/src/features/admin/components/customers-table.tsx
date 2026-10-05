'use client'

import { useEffect, useState } from 'react'
import { Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import type { AdminCustomer } from '@/types/admin'
import type { BackendMeta } from '@/lib/api/backend-mappers'

export function CustomersTable() {
  const [items, setItems] = useState<AdminCustomer[]>([])
  const [meta, setMeta] = useState<BackendMeta | null>(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pointsInput, setPointsInput] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async (term = query) => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.listCustomers(term || undefined)
      setItems(res.items)
      setMeta(res.meta ?? null)
      const initial: Record<string, string> = {}
      res.items.forEach((customer) => {
        initial[customer.id] = customer.loyaltyPoints != null ? String(customer.loyaltyPoints) : '0'
      })
      setPointsInput(initial)
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
        const res = await adminApi.listCustomers()
        if (!cancelled) {
          setItems(res.items)
          setMeta(res.meta ?? null)
          const initial: Record<string, string> = {}
          res.items.forEach((customer) => {
            initial[customer.id] = customer.loyaltyPoints != null ? String(customer.loyaltyPoints) : '0'
          })
          setPointsInput(initial)
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

  const toggleActive = async (customer: AdminCustomer) => {
    try {
      const updated = await adminApi.updateCustomer(customer.id, { isActive: !customer.isActive })
      setItems((prev) => prev.map((item) => (item.id === customer.id ? updated : item)))
      toast.success(updated.isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  const savePoints = async (customer: AdminCustomer) => {
    const raw = pointsInput[customer.id] ?? '0'
    const value = Math.max(0, Number(raw) || 0)
    try {
      const updated = await adminApi.updateCustomer(customer.id, { loyaltyPoints: value })
      setItems((prev) => prev.map((item) => (item.id === customer.id ? updated : item)))
      setPointsInput((prev) => ({ ...prev, [customer.id]: String(value) }))
      toast.success('تم تحديث نقاط الولاء')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  const deleteCustomer = async (customer: AdminCustomer) => {
    const name = customerName(customer)
    if (!confirm(`حذف العميل «${name}» نهائياً؟ ستبقى طلباته محفوظة دون ارتباط بحسابه.`)) return
    setDeletingId(customer.id)
    try {
      await adminApi.deleteCustomer(customer.id)
      setItems((prev) => prev.filter((item) => item.id !== customer.id))
      toast.success('تم حذف العميل مع الاحتفاظ بسجل طلباته')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  const customerName = (customer: AdminCustomer) =>
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || customer.phone || 'عميل'

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2 sm:max-w-sm"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(search)
          void load(search)
        }}
      >
        <Input placeholder="ابحث بالبريد أو الاسم…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="secondary" size="icon" aria-label="بحث">
          <Search className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <p className="text-sm text-muted">جارٍ تحميل العملاء…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <Users className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="text-sm text-muted">لا يوجد عملاء مطابقون.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-right text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-3 font-medium">العميل</th>
                  <th className="px-4 py-3 font-medium">الهاتف</th>
                  <th className="px-4 py-3 font-medium">المدينة</th>
                  <th className="px-4 py-3 font-medium">نقاط الولاء</th>
                  <th className="px-4 py-3 font-medium">الدور</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{customerName(customer)}</p>
                      {customer.email && <p className="text-xs text-muted" dir="ltr">{customer.email}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted" dir="ltr">
                      {customer.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">{customer.city ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          dir="ltr"
                          className="h-8 w-24 text-xs"
                          value={pointsInput[customer.id] ?? '0'}
                          onChange={(e) =>
                            setPointsInput((prev) => ({ ...prev, [customer.id]: e.target.value }))
                          }
                        />
                        <Button variant="outline" size="sm" onClick={() => void savePoints(customer)}>
                          حفظ
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {customer.isAdmin ? (
                        <span className="rounded-full bg-plum/10 px-2.5 py-1 text-xs font-medium text-plum">مدير</span>
                      ) : (
                        <span className="rounded-full bg-accent/70 px-2.5 py-1 text-xs font-medium text-accent-foreground">عميل</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => void toggleActive(customer)}
                        aria-label={customer.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                        className={cn(
                          'inline-flex cursor-pointer items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                          customer.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        )}
                      >
                        {customer.isActive ? 'نشط' : 'موقوف'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`حذف العميل ${customerName(customer)}`}
                        title="حذف العميل"
                        disabled={customer.isAdmin || deletingId === customer.id}
                        onClick={() => void deleteCustomer(customer)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
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