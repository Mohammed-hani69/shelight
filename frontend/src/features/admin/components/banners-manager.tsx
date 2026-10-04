'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Upload,
  XCircle,
} from 'lucide-react'
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
import { resolveMediaUrl } from '@/lib/api/media'
import { cn } from '@/lib/utils/cn'
import type { AdminBanner, AdminBannerSection, AdminBannerWrite } from '@/types/admin'

const SECTIONS: AdminBannerSection[] = ['HERO', 'EDITORIAL']

const SECTION_LABELS: Record<AdminBannerSection, string> = {
  HERO: 'الهيرو — أعلى الصفحة الرئيسية',
  EDITORIAL: 'الإديتوريال — وسط الصفحة الرئيسية',
}

interface BannerFormState {
  section: AdminBannerSection
  imageUrl: string
  linkUrl: string
  sortOrder: string
  isActive: boolean
}

const EMPTY_FORM: BannerFormState = {
  section: 'HERO',
  imageUrl: '',
  linkUrl: '',
  sortOrder: '0',
  isActive: true,
}

export function BannersManager() {
  const [items, setItems] = useState<AdminBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminBanner | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<BannerFormState>(EMPTY_FORM)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const bySection = useMemo(() => {
    return SECTIONS.map((section) => ({
      section,
      items: items.filter((item) => item.section === section),
    }))
  }, [items])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await adminApi.listBanners())
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
        const data = await adminApi.listBanners()
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

  const openCreate = (section: AdminBannerSection) => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, section })
    setFormOpen(true)
  }

  const openEdit = (banner: AdminBanner) => {
    setEditing(banner)
    setForm({
      section: banner.section,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl ?? '',
      sortOrder: String(banner.sortOrder ?? 0),
      isActive: banner.isActive,
    })
    setFormOpen(true)
  }

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const path = await adminApi.uploadBannerImage(file)
      setForm((prev) => ({ ...prev, imageUrl: path }))
      toast.success('تم رفع الصورة')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.imageUrl.trim()) {
      toast.error('اختر صورة أو أدخل رابط الصورة.')
      return
    }
    const payload: AdminBannerWrite = {
      section: form.section,
      imageUrl: form.imageUrl.trim(),
      linkUrl: form.linkUrl.trim() || null,
      sortOrder: form.sortOrder === '' ? 0 : Number(form.sortOrder),
      isActive: form.isActive,
    }
    setSaving(true)
    try {
      if (editing) {
        await adminApi.updateBanner(editing.id, payload)
        toast.success('تم حفظ التعديلات')
      } else {
        await adminApi.createBanner(payload)
        toast.success('تم إضافة البنر')
      }
      setFormOpen(false)
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const patchToggle = async (banner: AdminBanner) => {
    setBusyId(banner.id)
    try {
      const updated = await adminApi.patchBanner(banner.id, { isActive: !banner.isActive })
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(updated.isActive ? 'البنر ظاهر الآن في الموقع' : 'البنر مخفي من الموقع')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleMove = async (banner: AdminBanner, direction: 'up' | 'down') => {
    setBusyId(banner.id)
    try {
      await adminApi.moveBanner(banner.id, direction)
      toast.success('تم تحديث الترتيب')
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleHide = async (banner: AdminBanner) => {
    if (!confirm('إخفاء هذا البنر من الموقع؟')) return
    try {
      await adminApi.deleteBanner(banner.id)
      toast.success('تم إخفاء البنر')
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        تتحكّم هنا ببنرات الصفحة الرئيسية: بنرات «الهيرو» أعلى الصفحة، وبنرات «الإديتوريال»
        في منتصفها. رتّب البنرات بالأسهم، وأخفِ ما لا تريد عرضه.
      </p>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <p className="text-sm text-muted">جارٍ تحميل البنرات…</p>
      ) : (
        bySection.map(({ section, items: sectionItems }) => (
          <section key={section} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-plum">
                {SECTION_LABELS[section]}
              </h2>
              <Button size="sm" onClick={() => openCreate(section)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                إضافة بنر
              </Button>
            </div>

            {sectionItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center">
                <ImageIcon className="h-8 w-8 text-muted" aria-hidden="true" />
                <p className="text-sm text-muted">لا توجد بنرات في هذا القسم بعد.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-right text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        <th className="px-4 py-3 font-medium">الصورة</th>
                        <th className="px-4 py-3 font-medium">الرابط</th>
                        <th className="px-4 py-3 font-medium">الترتيب</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                        <th className="px-4 py-3 font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionItems.map((banner, index) => {
                        const isBusy = busyId === banner.id
                        return (
                          <tr
                            key={banner.id}
                            className={cn(
                              'border-b border-border/60 last:border-0',
                              !banner.isActive && 'bg-muted/40 opacity-70'
                            )}
                          >
                            <td className="px-4 py-3">
                              {/* روابط قد يكتبها المدير — لا نقيّدها بالنطاقات */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={resolveMediaUrl(banner.imageUrl)}
                                alt=""
                                className="h-14 w-24 rounded-md border border-border object-cover"
                              />
                            </td>
                            <td className="max-w-[220px] truncate px-4 py-3">
                              {banner.linkUrl ? (
                                <span dir="ltr" className="text-xs text-muted">
                                  {banner.linkUrl}
                                </span>
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="تحريك لأعلى"
                                  disabled={isBusy || index === 0}
                                  onClick={() => void handleMove(banner, 'up')}
                                >
                                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="تحريك لأسفل"
                                  disabled={isBusy || index === sectionItems.length - 1}
                                  onClick={() => void handleMove(banner, 'down')}
                                >
                                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => void patchToggle(banner)}
                                aria-label={banner.isActive ? 'إخفاء البنر' : 'إظهار البنر'}
                                className={cn(
                                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                                  banner.isActive
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                )}
                              >
                                {banner.isActive ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                                {banner.isActive ? 'ظاهر' : 'مخفي'}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(banner)}>
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                  تعديل
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="إخفاء"
                                  onClick={() => void handleHide(banner)}
                                >
                                  {banner.isActive ? (
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
          </section>
        ))
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل بنر' : 'بنر جديد'}</DialogTitle>
            <DialogDescription>
              ارفع صورة (أو الصق رابطها) وحدّد رابط الوجهة عند الضغط عليها.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="banner-section">القسم</Label>
              <select
                id="banner-section"
                className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                value={form.section}
                disabled={Boolean(editing)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, section: e.target.value as AdminBannerSection }))
                }
              >
                {SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {SECTION_LABELS[section]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banner-image">الصورة</Label>
              <div className="flex gap-2">
                <Input
                  id="banner-image"
                  dir="ltr"
                  placeholder="/uploads/banners/… أو https://…"
                  value={form.imageUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  )}
                  رفع صورة
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
              {form.imageUrl && (
                // معاينة الرابط المدخل مباشرة
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(form.imageUrl)}
                  alt=""
                  className="mt-2 h-28 w-full rounded-md border border-border object-cover"
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="banner-link">رابط الوجهة (اختياري)</Label>
                <Input
                  id="banner-link"
                  dir="ltr"
                  placeholder="/products/… أو /bundles"
                  value={form.linkUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-order">الترتيب</Label>
                <Input
                  id="banner-order"
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
                <span className="text-sm">ظاهر في الموقع</span>
              </label>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving || uploading}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editing ? 'حفظ' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
