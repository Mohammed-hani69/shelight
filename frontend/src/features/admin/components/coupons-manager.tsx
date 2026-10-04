'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Plus, TicketPercent, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import type { AdminCoupon, AdminCouponWrite } from '@/types/admin'

interface CouponFormState {
  code: string
  discountType: 'percent' | 'fixed'
  value: string
  minSpend: string
  usageLimit: string
  validFrom: string
  validUntil: string
}

const EMPTY_FORM: CouponFormState = {
  code: '',
  discountType: 'percent',
  value: '',
  minSpend: '0',
  usageLimit: '',
  validFrom: '',
  validUntil: '',
}

function toLocalInput(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return date.toISOString()
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CouponsManager() {
  const [items, setItems] = useState<AdminCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<AdminCoupon | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM)
  const [isActiveToggle, setIsActiveToggle] = useState(true)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await adminApi.listCoupons())
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
        const data = await adminApi.listCoupons()
        if (!cancelled) setItems(data)
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

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setIsActiveToggle(true)
    setFormOpen(true)
  }

  const openEdit = (coupon: AdminCoupon) => {
    setEditing(coupon)
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value ? String(coupon.value) : '',
      minSpend: coupon.minSpend ? String(coupon.minSpend) : '0',
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
      validFrom: toLocalInput(coupon.validFrom),
      validUntil: toLocalInput(coupon.validUntil),
    })
    setIsActiveToggle(coupon.isActive)
    setFormOpen(true)
  }

  const buildPayload = (): AdminCouponWrite => ({
    code: form.code.trim().toUpperCase(),
    discountType: form.discountType,
    value: form.value,
    minSpend: form.minSpend,
    usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
    validFrom: fromLocalInput(form.validFrom),
    validUntil: fromLocalInput(form.validUntil),
    isActive: isActiveToggle,
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.code.trim() || !form.value) {
      toast.error('رمز الخصم والقيمة حقلا إجباريان.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await adminApi.updateCoupon(editing.id, buildPayload())
        toast.success('تم تحديث الكوبون')
      } else {
        await adminApi.createCoupon(buildPayload())
        toast.success('تم إنشاء الكوبون')
      }
      setFormOpen(false)
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon: AdminCoupon) => {
    try {
      const updated = await adminApi.updateCoupon(coupon.id, { isActive: !coupon.isActive })
      setItems((prev) => prev.map((item) => (item.id === coupon.id ? updated : item)))
      toast.success(updated.isActive ? 'تم تفعيل الكوبون' : 'تم إيقاف الكوبون')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  const handleDelete = async (coupon: AdminCoupon) => {
    if (!confirm(`حذف كوبون «${coupon.code}» نهائياً؟`)) return
    try {
      await adminApi.deleteCoupon(coupon.id)
      toast.success('تم حذف الكوبون')
      setItems((prev) => prev.filter((item) => item.id !== coupon.id))
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة كوبون
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <p className="text-sm text-muted">جارٍ تحميل الكوبونات…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <TicketPercent className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="text-sm text-muted">لا توجد كوبونات بعد.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-3 font-medium">الرمز</th>
                  <th className="px-4 py-3 font-medium">النوع</th>
                  <th className="px-4 py-3 font-medium">القيمة</th>
                  <th className="px-4 py-3 font-medium">الحد الأدنى</th>
                  <th className="px-4 py-3 font-medium">الاستخدام</th>
                  <th className="px-4 py-3 font-medium">الصلاحية</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-semibold text-plum" dir="ltr">
                      {coupon.code}
                    </td>
                    <td className="px-4 py-3">
                      {coupon.discountType === 'percent' ? 'نسبة مئوية' : 'قيمة ثابتة'}
                    </td>
                    <td className="px-4 py-3">
                      {coupon.discountType === 'percent' ? `${coupon.value}%` : `${coupon.value} LE`}
                    </td>
                    <td className="px-4 py-3 text-muted">{coupon.minSpend ? `${coupon.minSpend} LE` : '—'}</td>
                    <td className="px-4 py-3 text-muted">
                      {coupon.usageLimit != null ? `${coupon.usedCount}/${coupon.usageLimit}` : `${coupon.usedCount}`}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {coupon.validFrom || coupon.validUntil
                        ? `${formatDate(coupon.validFrom)} ← ${formatDate(coupon.validUntil)}`
                        : 'بدون قيد'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void toggleActive(coupon)}
                        aria-label={coupon.isActive ? 'إيقاف الكوبون' : 'تفعيل الكوبون'}
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                          coupon.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        )}
                      >
                        {coupon.isActive ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {coupon.isActive ? 'نشط' : 'موقوف'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(coupon)}>
                          تعديل
                        </Button>
                        <Button variant="ghost" size="sm" aria-label="حذف" onClick={() => void handleDelete(coupon)}>
                          <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل كوبون' : 'كوبون جديد'}</DialogTitle>
            <DialogDescription>
              {editing ? 'عدّل النوع والقيمة والصلاحية ثم احفظ.' : 'أنشئ رمز خصم جديد للعملاء.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="coupon-code">الرمز</Label>
                <Input id="coupon-code" dir="ltr" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-type">النوع</Label>
                <select
                  id="coupon-type"
                  className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  value={form.discountType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, discountType: e.target.value as 'percent' | 'fixed' }))
                  }
                >
                  <option value="percent">نسبة مئوية</option>
                  <option value="fixed">قيمة ثابتة (LE)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-value">القيمة</Label>
                <Input
                  id="coupon-value"
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  value={form.value}
                  onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-min">الحد الأدنى للشراء (اختياري)</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  value={form.minSpend}
                  onChange={(e) => setForm((prev) => ({ ...prev, minSpend: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-limit">حد الاستخدام (اختياري)</Label>
                <Input
                  id="coupon-limit"
                  type="number"
                  min="0"
                  dir="ltr"
                  placeholder="بلا في حالة الفراغ"
                  value={form.usageLimit}
                  onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-active">الحالة</Label>
                <label className="flex h-11 items-center gap-2 rounded-md border border-border px-3">
                  <input
                    id="coupon-active"
                    type="checkbox"
                    checked={isActiveToggle}
                    onChange={(e) => setIsActiveToggle(e.target.checked)}
                  />
                  <span className="text-sm">نشط</span>
                </label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-from">يبدأ من (اختياري)</Label>
                <Input
                  id="coupon-from"
                  type="datetime-local"
                  dir="ltr"
                  value={form.validFrom}
                  onChange={(e) => setForm((prev) => ({ ...prev, validFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-until">ينتهي عند (اختياري)</Label>
                <Input
                  id="coupon-until"
                  type="datetime-local"
                  dir="ltr"
                  value={form.validUntil}
                  onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editing ? 'حفظ' : 'إنشاء'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}