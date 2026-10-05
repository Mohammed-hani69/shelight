'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { resolveMediaUrl } from '@/lib/api/media'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AdminImageUpload } from '@/features/admin/components/admin-image-upload'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi, formatAmount } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import type { AdminBundle, AdminBundleWrite, AdminProduct } from '@/types/admin'

interface BundleItemForm {
  productSlug: string
  quantity: string
}

interface BundleFormState {
  nameAr: string
  nameEn: string
  slug: string
  descriptionAr: string
  descriptionEn: string
  imageUrl: string
  badgeAr: string
  badgeEn: string
  price: string
  couponCode: string
  sortOrder: string
  isActive: boolean
  items: BundleItemForm[]
}

const EMPTY_FORM: BundleFormState = {
  nameAr: '',
  nameEn: '',
  slug: '',
  descriptionAr: '',
  descriptionEn: '',
  imageUrl: '',
  badgeAr: '',
  badgeEn: '',
  price: '',
  couponCode: '',
  sortOrder: '0',
  isActive: true,
  items: [],
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** تنسيق لوحة الأرقام — يقطع الأصفار غير الضرورية لعرض مجموع المنفرد. */
function trimZero(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function BundlesManager() {
  const [items, setItems] = useState<AdminBundle[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminBundle | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<BundleFormState>(EMPTY_FORM)
  const [productQuery, setProductQuery] = useState('')

  const productBySlug = useMemo(() => {
    const map = new Map<string, AdminProduct>()
    for (const product of products) map.set(product.slug, product)
    return map
  }, [products])

  /** مجموع أسعار الأعضاء المختارين — المرجع الذي يُحسب منه الوفر. */
  const memberTotal = useMemo(() => {
    return form.items.reduce((sum, entry) => {
      const product = productBySlug.get(entry.productSlug)
      const quantity = Math.max(0, Number(entry.quantity) || 0)
      return sum + (product ? product.price * quantity : 0)
    }, 0)
  }, [form.items, productBySlug])

  const bundlePrice = Math.max(0, Number(form.price) || 0)
  const savings = Math.max(0, memberTotal - bundlePrice)
  const discountPercent = memberTotal > 0 ? Math.round((savings / memberTotal) * 100) : 0

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await adminApi.listBundles())
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
        const [bundles, productPage] = await Promise.all([
          adminApi.listBundles(),
          // كل المنتجات مرة واحدة — ننتقي منوعتها عند بناء الباقة.
          adminApi.listProducts({ pageSize: 100 }),
        ])
        if (cancelled) return
        setItems(bundles)
        setProducts(productPage.items)
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
    setProductQuery('')
    setFormOpen(true)
  }

  const openEdit = (bundle: AdminBundle) => {
    setEditing(bundle)
    setForm({
      nameAr: bundle.nameAr,
      nameEn: bundle.nameEn,
      slug: bundle.slug,
      descriptionAr: bundle.descriptionAr ?? '',
      descriptionEn: bundle.descriptionEn ?? '',
      imageUrl: bundle.imageUrl ?? '',
      badgeAr: bundle.badgeAr ?? '',
      badgeEn: bundle.badgeEn ?? '',
      price: trimZero(bundle.price),
      couponCode: bundle.couponCode ?? '',
      sortOrder: String(bundle.sortOrder ?? 0),
      isActive: bundle.isActive,
      items: bundle.items.map((item) => ({
        productSlug: item.productSlug,
        quantity: String(item.quantity),
      })),
    })
    setProductQuery('')
    setFormOpen(true)
  }

  /** منتجات قابلة للإضافة — نشطة وغير مضافة بالفعل، مع ترشيح بالبحث. */
  const availableProducts = useMemo(() => {
    const chosen = new Set(form.items.map((entry) => entry.productSlug))
    const query = productQuery.trim().toLowerCase()
    return products.filter((product) => {
      if (product.isActive === false || chosen.has(product.slug)) return false
      if (!query) return true
      const haystack = `${product.nameAr ?? ''} ${product.nameEn ?? ''} ${product.slug}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [products, form.items, productQuery])

  const addMember = (slug: string) => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productSlug: slug, quantity: '1' }],
    }))
    setProductQuery('')
  }

  const adjustQuantity = (index: number, delta: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((entry, i) => {
        if (i !== index) return entry
        const next = Math.max(1, (Number(entry.quantity) || 1) + delta)
        return { ...entry, quantity: String(next) }
      }),
    }))
  }

  const updateItem = (index: number, patch: Partial<BundleItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    }))
  }

  const removeItem = (index: number) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.nameEn.trim() && !form.nameAr.trim()) {
      toast.error('أدخل اسم الباقة بالعربية أو الإنجليزية.')
      return
    }
    const slug = form.slug.trim() || toSlug(form.nameEn) || toSlug(form.nameAr)
    if (!slug) {
      toast.error('أدخل اسماً لتوليد معرّف الباقة.')
      return
    }
    if (!(Number(form.price) > 0)) {
      toast.error('حدد سعر الباقة — يجب أن يكون رقماً أكبر من صفر.')
      return
    }
    if (form.items.length === 0) {
      toast.error('أضف منتجاً واحداً على الأقل للباقة.')
      return
    }
    const seen = new Set<string>()
    for (const entry of form.items) {
      if (!entry.productSlug || seen.has(entry.productSlug)) {
        toast.error('منتج مكرر أو غير محدد في الأعضاء — اختر منتجاً لكل سطر.')
        return
      }
      seen.add(entry.productSlug)
    }
    const slugTaken =
      !editing && items.some((bundle) => bundle.slug === slug)
    if (slugTaken) {
      toast.error('معرّف الباقة مستخدم مسبقاً — اختر معرّفاً مختلفاً (slug).')
      return
    }
    const payload: AdminBundleWrite = {
      slug,
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      descriptionAr: form.descriptionAr,
      descriptionEn: form.descriptionEn,
      imageUrl: form.imageUrl.trim() || undefined,
      badgeAr: form.badgeAr.trim() || undefined,
      badgeEn: form.badgeEn.trim() || undefined,
      price: String(Number(form.price)),
      couponCode: form.couponCode.trim() || undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder === '' ? 0 : Number(form.sortOrder),
      items: form.items.map((entry) => ({
        productSlug: entry.productSlug,
        quantity: Math.max(1, Number(entry.quantity) || 1),
      })),
    }
    setSaving(true)
    try {
      if (editing) {
        await adminApi.updateBundle(editing.id, payload)
        toast.success('تم حفظ التعديلات')
      } else {
        await adminApi.createBundle(payload)
        toast.success('تم إنشاء الباقة')
      }
      setFormOpen(false)
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /** تبديل الحالة (إظهار/إخفاء) دون إعادة فتح النموذج. */
  const toggleActive = async (bundle: AdminBundle) => {
    setBusyId(bundle.id)
    try {
      const updated = await adminApi.patchBundle(bundle.id, { isActive: !bundle.isActive })
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(updated.isActive ? 'الباقة ظاهرة الآن في الموقع' : 'الباقة مخفية من الموقع')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleMove = async (bundle: AdminBundle, direction: 'up' | 'down') => {
    setBusyId(bundle.id)
    try {
      await adminApi.moveBundle(bundle.id, direction)
      toast.success('تم تحديث الترتيب')
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleHide = async (bundle: AdminBundle) => {
    const label = bundle.nameAr || bundle.nameEn
    if (!confirm(`إخفاء باقة «${label}» من الموقع؟`)) return
    try {
      await adminApi.deleteBundle(bundle.id)
      toast.success('تم إخفاء الباقة')
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  const sorted = useMemo(() => [...items].sort((a, b) => a.sortOrder - b.sortOrder), [items])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          الباقات النشطة تظهر في قسم «دللي نفسك» بالصفحة الرئيسية وصفحة العروض — ويُحسب سعر
          المقارنة من أعضائها و«كوبونها» آلياً كي يُدفع السعر المعلن عند الشراء.
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة باقة
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <p className="text-sm text-muted">جارٍ تحميل الباقات…</p>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <Gift className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="text-sm text-muted">لا توجد باقات بعد.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-right text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-3 font-medium">الباقة</th>
                  <th className="px-4 py-3 font-medium">الأعضاء</th>
                  <th className="px-4 py-3 font-medium">السعر والوفر</th>
                  <th className="px-4 py-3 font-medium">الترتيب</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((bundle, index) => {
                  const isBusy = busyId === bundle.id
                  return (
                    <tr
                      key={bundle.id}
                      className={cn(
                        'border-b border-border/60 last:border-0',
                        !bundle.isActive && 'bg-muted/40 opacity-70'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {bundle.imageUrl ? (
                            // روابط خارجية يكتبها المدير — لا نقيّدها بالنطاقات المعتمدة
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveMediaUrl(bundle.imageUrl)}
                              alt=""
                              className="h-11 w-11 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent/60 text-muted">
                              <Package className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                          <div>
                            <p className="font-semibold text-plum">
                              {bundle.nameAr || bundle.nameEn}
                              {bundle.badgeAr && (
                                <span className="ms-2 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                                  {bundle.badgeAr}
                                </span>
                              )}
                            </p>
                            <p dir="ltr" className="text-xs text-muted" style={{ textAlign: 'right' }}>
                              {bundle.nameEn} · {bundle.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-0.5">
                          {bundle.items.map((item) => (
                            <li key={item.productSlug} className="text-xs text-muted">
                              {item.quantity}× {item.productSlug}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p>
                            <span className="font-semibold text-plum">{formatAmount(bundle.price)}</span>
                            <span className="ms-2 text-xs text-muted line-through">
                              {formatAmount(bundle.compareAtPrice)}
                            </span>
                          </p>
                          {bundle.savings > 0 && (
                            <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              وفر {formatAmount(bundle.savings)}
                            </span>
                          )}
                          {bundle.couponCode && (
                            <p dir="ltr" className="text-[10px] text-muted" style={{ textAlign: 'right' }}>
                              {bundle.couponCode}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="تحريك لأعلى"
                            disabled={isBusy || index === 0}
                            onClick={() => void handleMove(bundle, 'up')}
                          >
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="تحريك لأسفل"
                            disabled={isBusy || index === sorted.length - 1}
                            onClick={() => void handleMove(bundle, 'down')}
                          >
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void toggleActive(bundle)}
                          aria-label={bundle.isActive ? 'إخفاء الباقة' : 'إظهار الباقة'}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                            bundle.isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          )}
                        >
                          {bundle.isActive ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {bundle.isActive ? 'ظاهرة' : 'مخفية'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(bundle)}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            تعديل
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={bundle.isActive ? 'إخفاء' : 'إظهار'}
                            onClick={() => void handleHide(bundle)}
                          >
                            {bundle.isActive ? (
                              <EyeOff className="h-4 w-4 text-danger" aria-hidden="true" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted" aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-h-[90vh]">
          <DialogHeader className="shrink-0 border-b border-border py-4 pl-4 pr-12 text-right sm:px-6 sm:py-5 sm:text-right">
            <DialogTitle className="text-xl">{editing ? 'تعديل باقة' : 'باقة جديدة'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'عدّل الأعضاء والسعر ثم احفظ — سعر المقارنة والكوبون يتجددا تلقائياً.'
                : 'اجمع منتجات في طقم واحد بسعر أقل — «روتين كامل بسعر أفضل».'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="b-name-ar">الاسم بالعربية</Label>
                <Input
                  id="b-name-ar"
                  value={form.nameAr}
                  onChange={(e) => setForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-name-en">الاسم بالإنجليزية</Label>
                <Input
                  id="b-name-en"
                  dir="ltr"
                  value={form.nameEn}
                  onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-slug">المعرّف (slug)</Label>
                <Input
                  id="b-slug"
                  dir="ltr"
                  placeholder="يُولّد تلقائياً إن تُرك فارغاً"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-badge-ar">الشارة بالعربية (اختياري)</Label>
                <Input
                  id="b-badge-ar"
                  placeholder="مثال: الأكثر مبيعاً"
                  value={form.badgeAr}
                  onChange={(e) => setForm((prev) => ({ ...prev, badgeAr: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-badge-en">الشارة بالإنجليزية (اختياري)</Label>
                <Input
                  id="b-badge-en"
                  dir="ltr"
                  placeholder="Example: Best Seller"
                  value={form.badgeEn}
                  onChange={(e) => setForm((prev) => ({ ...prev, badgeEn: e.target.value }))}
                />
              </div>
              <AdminImageUpload
                id="b-image"
                label="صورة الباقة (اختياري)"
                value={form.imageUrl}
                onChange={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
                onUploadingChange={setImageUploading}
              />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="b-desc-ar">الوصف بالعربية (اختياري)</Label>
                <Textarea
                  id="b-desc-ar"
                  rows={2}
                  value={form.descriptionAr}
                  onChange={(e) => setForm((prev) => ({ ...prev, descriptionAr: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="b-desc-en">الوصف بالإنجليزية (اختياري)</Label>
                <Textarea
                  id="b-desc-en"
                  rows={2}
                  dir="ltr"
                  value={form.descriptionEn}
                  onChange={(e) => setForm((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-base">منتجات الباقة</Label>
                  <p className="mt-0.5 text-xs text-muted">
                    اختر المنتجات التي يتكوّن منها الطقم وحدّد الكمية.
                  </p>
                </div>
                {form.items.length > 0 && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {form.items.length} منتج
                  </span>
                )}
              </div>

              {form.items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                  <Package className="h-7 w-7 text-muted" aria-hidden="true" />
                  <p className="text-sm text-muted">لم تُضف منتجات بعد — ابحث بالأسفل واختر ما تريد.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {form.items.map((entry, index) => {
                    const product = productBySlug.get(entry.productSlug)
                    const thumbnail = product?.images?.[0]?.url
                    const lineTotal = product ? product.price * (Number(entry.quantity) || 0) : 0
                    return (
                      <li
                        key={index}
                        className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-surface p-2.5 sm:flex sm:gap-3"
                      >
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                          {thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted">
                              <Package className="h-5 w-5" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-charcoal">
                            {product?.nameAr || product?.nameEn || entry.productSlug}
                          </p>
                          <p className="text-xs text-muted">
                            {product ? `${formatAmount(product.price)} للوحدة` : 'منتج غير معروف'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center rounded-full border border-border">
                          <button
                            type="button"
                            aria-label="تقليل الكمية"
                            disabled={(Number(entry.quantity) || 1) <= 1}
                            onClick={() => adjustQuantity(index, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted/50 hover:text-charcoal disabled:opacity-40"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <input
                            aria-label="الكمية"
                            type="number"
                            min="1"
                            dir="ltr"
                            value={entry.quantity}
                            onChange={(e) => updateItem(index, { quantity: e.target.value })}
                            className="w-10 border-0 bg-transparent text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            aria-label="زيادة الكمية"
                            onClick={() => adjustQuantity(index, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted/50 hover:text-charcoal"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                        <span className="col-start-2 text-right text-sm font-semibold text-charcoal sm:ml-auto sm:w-20 sm:shrink-0 sm:text-left">
                          {formatAmount(lineTotal)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="col-start-3 row-start-2 sm:row-auto"
                          aria-label="إزالة المنتج"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <Input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="ابحث عن منتج بالاسم…"
                    className="pr-9"
                  />
                </div>
                <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                  {availableProducts.length === 0 ? (
                    <li className="px-2 py-3 text-center text-xs text-muted">
                      {products.length === 0
                        ? 'لا توجد منتجات متاحة.'
                        : 'كل المنتجات المطابقة مضافة بالفعل.'}
                    </li>
                  ) : (
                    availableProducts.map((product) => (
                      <li key={product.slug}>
                        <button
                          type="button"
                          onClick={() => addMember(product.slug)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-right transition-colors hover:bg-primary/5"
                        >
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted/40">
                            {product.images?.[0]?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={resolveMediaUrl(product.images[0].url)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted">
                                <Package className="h-4 w-4" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-charcoal">
                              {product.nameAr || product.nameEn}
                            </p>
                            <p className="text-xs text-muted">{formatAmount(product.price)}</p>
                          </div>
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border p-4">
              <Label className="text-base">التسعير والإعدادات</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="b-price">سعر الباقة (جنيه)</Label>
                  <Input
                    id="b-price"
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    placeholder="مثال: 299"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b-coupon">كود الخصم (اختياري)</Label>
                  <Input
                    id="b-coupon"
                    dir="ltr"
                    placeholder="يُولّد آلياً إن تُرك فارغاً"
                    value={form.couponCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, couponCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b-order">الترتيب</Label>
                  <Input
                    id="b-order"
                    type="number"
                    min="0"
                    dir="ltr"
                    value={form.sortOrder}
                    onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  />
                </div>
                <label className="flex h-11 items-center gap-2 self-end rounded-md border border-border px-3">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <span className="text-sm">ظاهرة في الموقع</span>
                </label>
              </div>
              <div
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                  savings > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-muted/40 text-muted'
                )}
              >
                <span>{savings > 0 ? 'وفّر العميل' : 'لا يوجد وفر حتى الآن'}</span>
                <span className="font-semibold">
                  {savings > 0 ? `${formatAmount(savings)} (${discountPercent}%)` : '—'}
                </span>
              </div>
            </div>

            </div>

            <div className="shrink-0 border-t border-border bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
                  <span className="text-muted">
                    مجموع المنفرد:{' '}
                    <b className="font-semibold text-charcoal">{formatAmount(memberTotal)}</b>
                  </span>
                  <span className="text-muted">
                    سعر الباقة:{' '}
                    <b className="font-semibold text-charcoal">{formatAmount(bundlePrice)}</b>
                  </span>
                  <span className={cn('font-semibold', savings > 0 ? 'text-emerald-700' : 'text-muted')}>
                    {savings > 0
                      ? `وفر ${formatAmount(savings)} (${discountPercent}%)`
                      : 'لا يوجد وفر بعد'}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={saving || imageUploading}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {editing ? 'حفظ التعديلات' : 'إنشاء الباقة'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}