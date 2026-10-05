'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  Star,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AdminImageUpload } from '@/features/admin/components/admin-image-upload'
import { resolveMediaUrl } from '@/lib/api/media'
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
import type { AdminCategory, AdminCategoryWrite } from '@/types/admin'

interface CategoryFormState {
  nameAr: string
  nameEn: string
  slug: string
  descriptionAr: string
  descriptionEn: string
  imageUrl: string
  parentSlug: string
  sortOrder: string
  isFeatured: boolean
  isActive: boolean
}

const EMPTY_FORM: CategoryFormState = {
  nameAr: '',
  nameEn: '',
  slug: '',
  descriptionAr: '',
  descriptionEn: '',
  imageUrl: '',
  parentSlug: '',
  sortOrder: '0',
  isFeatured: false,
  isActive: true,
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface Row {
  category: AdminCategory
  depth: number
}

function flattenTree(categories: AdminCategory[], depth = 0): Row[] {
  const rows: Row[] = []
  for (const category of categories) {
    rows.push({ category, depth })
    if (category.children?.length) rows.push(...flattenTree(category.children, depth + 1))
  }
  return rows
}

/** إعداد زر «أعلى/أسفل» — نُحرّك فقط بين إخوة نفس المستوى والنفس الأب. */
function canMove(rows: Row[], index: number, direction: 'up' | 'down'): boolean {
  const neighbour = direction === 'up' ? rows[index - 1] : rows[index + 1]
  if (!neighbour) return false
  const current = rows[index].category
  return neighbour.category.parentId === current.parentId
}

export function CategoriesManager() {
  const [items, setItems] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM)

  const rootOptions = useMemo(() => {
    if (!editing) return items
    return items.filter((category) => category.id !== editing.id)
  }, [items, editing])

  const rows = useMemo(() => flattenTree(items), [items])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await adminApi.listCategories())
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
        const data = await adminApi.listCategories()
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
    setFormOpen(true)
  }

  const openEdit = (category: AdminCategory) => {
    setEditing(category)
    setForm({
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      slug: category.slug,
      descriptionAr: category.descriptionAr ?? '',
      descriptionEn: category.descriptionEn ?? '',
      imageUrl: category.imageUrl ?? '',
      parentSlug: category.parentSlug ?? '',
      sortOrder: String(category.sortOrder ?? 0),
      isFeatured: category.isFeatured,
      isActive: category.isActive,
    })
    setFormOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.nameEn.trim() || !form.nameAr.trim()) {
      toast.error('الاسم بالعربية والإنجليزية حقلا إجباريان.')
      return
    }
    const slug = form.slug.trim() || toSlug(form.nameEn)
    if (!slug) {
      toast.error('أدخل اسم القسم بالإنجليزية أو معرفاً مختصراً (slug).')
      return
    }
    const payload: AdminCategoryWrite = {
      slug,
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      descriptionAr: form.descriptionAr,
      descriptionEn: form.descriptionEn,
      imageUrl: form.imageUrl.trim() || null,
      parentSlug: form.parentSlug || null,
      sortOrder: form.sortOrder === '' ? 0 : Number(form.sortOrder),
      isFeatured: form.isFeatured,
      isActive: form.isActive,
    }
    setSaving(true)
    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, payload)
        toast.success('تم حفظ التعديلات')
      } else {
        await adminApi.createCategory(payload)
        toast.success('تم إنشاء القسم')
      }
      setFormOpen(false)
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /** تبديل سريع (تمييز/إخفاء) دون إعادة فتح نموذج التعديل. */
  const patchToggle = async (category: AdminCategory, field: 'isFeatured' | 'isActive') => {
    setBusyId(category.id)
    try {
      const updated = await adminApi.patchCategory(category.id, {
        [field]: field === 'isActive' ? !category.isActive : !category.isFeatured,
      })
      setItems((prev) => mergeNode(prev, updated))
      if (field === 'isFeatured') {
        toast.success(updated.isFeatured ? 'ظهر القسم في الرئيسية' : 'أُزيل القسم من الرئيسية')
      } else {
        toast.success(updated.isActive ? 'القسم ظاهر الآن في الموقع' : 'القسم مخفي من الموقع')
      }
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleMove = async (category: AdminCategory, direction: 'up' | 'down') => {
    setBusyId(category.id)
    try {
      await adminApi.moveCategory(category.id, direction)
      toast.success('تم تحديث الترتيب')
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleHide = async (category: AdminCategory) => {
    const label = category.nameAr || category.nameEn
    if (!confirm(`إخفاء قسم «${label}» من الموقع؟`)) return
    try {
      await adminApi.deleteCategory(category.id)
      toast.success('تم إخفاء القسم')
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          الأقسام النشطة تظهر في الرئيسية وقائمة التنقل والفوتر — والمميّزة منها تظهر في قسم
          «الأقسام» بالصفحة الرئيسية.
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة قسم
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <p className="text-sm text-muted">جارٍ تحميل الأقسام…</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <FolderTree className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="text-sm text-muted">لا توجد أقسام بعد.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-3 font-medium">القسم</th>
                  <th className="px-4 py-3 font-medium">الصورة</th>
                  <th className="px-4 py-3 font-medium">المنتجات</th>
                  <th className="px-4 py-3 font-medium">الترتيب</th>
                  <th className="px-4 py-3 font-medium">مميّز</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ category, depth }, index) => {
                  const isBusy = busyId === category.id
                  const overridden = category.parentId != null
                  return (
                    <tr
                      key={category.id}
                      className={cn(
                        'border-b border-border/60 last:border-0',
                        !category.isActive && 'bg-muted/40 opacity-70'
                      )}
                    >
                      <td className="px-4 py-3" style={{ paddingInlineStart: 16 + depth * 28 }}>
                        <div className="flex items-center gap-2">
                          {depth > 0 && (
                            <span className="text-xs text-muted" aria-hidden="true">
                              └
                            </span>
                          )}
                          <div>
                            <p className="font-semibold text-plum">
                              {category.nameAr || category.nameEn}
                            </p>
                            <p dir="ltr" className="text-xs text-muted" style={{ textAlign: 'right' }}>
                              {category.nameEn} · {category.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {category.imageUrl ? (
                          // روابط خارجية يكتبها المدير — لا نقيّدها بالنطاقات المعتمدة
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveMediaUrl(category.imageUrl)}
                            alt=""
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/60 text-muted">
                            <FolderTree className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">{category.productsCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="تحريك لأعلى"
                            disabled={isBusy || !canMove(rows, index, 'up')}
                            onClick={() => void handleMove(category, 'up')}
                          >
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="تحريك لأسفل"
                            disabled={isBusy || !canMove(rows, index, 'down')}
                            onClick={() => void handleMove(category, 'down')}
                          >
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void patchToggle(category, 'isFeatured')}
                          aria-label={category.isFeatured ? 'إزالة التمييز' : 'تمييز القسم'}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                            category.isFeatured
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-muted/60 text-muted hover:bg-muted'
                          )}
                        >
                          <Star
                            className={cn('h-3.5 w-3.5', category.isFeatured && 'fill-amber-500')}
                            aria-hidden="true"
                          />
                          {category.isFeatured ? 'مميّز' : 'عادي'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void patchToggle(category, 'isActive')}
                          aria-label={category.isActive ? 'إخفاء القسم' : 'إظهار القسم'}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                            category.isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          )}
                        >
                          {category.isActive ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {category.isActive ? 'ظاهر' : 'مخفي'}
                        </button>
                        {overridden && category.parentId && (
                          <span className="ms-2 inline-block rounded-full bg-accent/70 px-2 py-0.5 text-[10px] text-accent-foreground">
                            فرعي
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            تعديل
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={category.isActive ? 'إخفاء' : 'إظهار'}
                            onClick={() => void handleHide(category)}
                          >
                            {category.isActive ? (
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
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-h-[90vh]">
          <DialogHeader className="shrink-0 border-b border-border py-4 pl-4 pr-12 text-right sm:px-6 sm:py-5 sm:text-right">
            <DialogTitle>{editing ? 'تعديل قسم' : 'قسم جديد'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'عدّل البيانات ثم احفظ — التغييرات تظهر في الموقع فوراً.'
                : 'أنشئ قسماً جديداً ليظهر في أقسام الموقع ويُدار من هنا.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name-ar">الاسم بالعربية</Label>
                <Input
                  id="cat-name-ar"
                  value={form.nameAr}
                  onChange={(e) => setForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-name-en">الاسم بالإنجليزية</Label>
                <Input
                  id="cat-name-en"
                  dir="ltr"
                  value={form.nameEn}
                  onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-slug">المعرّف (slug)</Label>
                <Input
                  id="cat-slug"
                  dir="ltr"
                  placeholder="يُولّد تلقائياً إن تُرك فارغاً"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-parent">القسم الرئيسي (اختياري)</Label>
                <select
                  id="cat-parent"
                  className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  value={form.parentSlug}
                  onChange={(e) => setForm((prev) => ({ ...prev, parentSlug: e.target.value }))}
                >
                  <option value="">— قسم رئيسي —</option>
                  {rootOptions.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.nameAr || category.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-order">الترتيب</Label>
                <Input
                  id="cat-order"
                  type="number"
                  min="0"
                  dir="ltr"
                  value={form.sortOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                />
              </div>
              <AdminImageUpload
                id="cat-image"
                label="صورة القسم (اختياري)"
                value={form.imageUrl}
                onChange={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
                onUploadingChange={setImageUploading}
              />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-desc-ar">الوصف بالعربية (اختياري)</Label>
                <Textarea
                  id="cat-desc-ar"
                  rows={2}
                  value={form.descriptionAr}
                  onChange={(e) => setForm((prev) => ({ ...prev, descriptionAr: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-desc-en">الوصف بالإنجليزية (اختياري)</Label>
                <Textarea
                  id="cat-desc-en"
                  rows={2}
                  dir="ltr"
                  value={form.descriptionEn}
                  onChange={(e) => setForm((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                />
              </div>
              <label className="flex h-11 items-center gap-2 rounded-md border border-border px-3">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                />
                <span className="text-sm">مميّز — يظهر في قسم «الأقسام» بالصفحة الرئيسية</span>
              </label>
              <label className="flex h-11 items-center gap-2 rounded-md border border-border px-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <span className="text-sm">ظاهر في الموقع</span>
              </label>
            </div>
            </div>
            <DialogFooter className="shrink-0 border-t border-border bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
              <Button type="submit" disabled={saving || imageUploading}>
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

/** يدمج القسم المُحدَّث داخل الشجرة مع الحفاظ على أبنائه. */
function mergeNode(tree: AdminCategory[], updated: AdminCategory): AdminCategory[] {
  return tree.map((node) => {
    if (node.id === updated.id) return { ...node, ...updated, children: node.children }
    if (node.children?.length) return { ...node, children: mergeNode(node.children, updated) }
    return node
  })
}