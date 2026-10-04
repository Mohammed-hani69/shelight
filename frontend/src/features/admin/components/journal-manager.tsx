'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Newspaper,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import type { AdminJournalArticle, AdminJournalWrite } from '@/types/admin'

interface JournalFormState {
  slug: string
  titleAr: string
  titleEn: string
  excerptAr: string
  excerptEn: string
  contentAr: string
  contentEn: string
  category: string
  author: string
  readTime: string
  publishDate: string
  imageUrl: string
  isFeatured: boolean
  isPublished: boolean
}

const EMPTY_FORM: JournalFormState = {
  slug: '',
  titleAr: '',
  titleEn: '',
  excerptAr: '',
  excerptEn: '',
  contentAr: '',
  contentEn: '',
  category: 'المدونة',
  author: 'فريق شيلايت',
  readTime: 'قراءة 5 دقائق',
  publishDate: new Date().toISOString().slice(0, 10),
  imageUrl: '',
  isFeatured: false,
  isPublished: true,
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** فصل الفقرات بسطر فارغ — يطابق `content` كقائمة نصية في الـ backend. */
function splitParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function joinParagraphs(paragraphs: string[]): string {
  return (paragraphs ?? []).join('\n\n')
}

/** تنسيق التاريخ للعرض بالعربية. */
function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function JournalManager() {
  const [articles, setArticles] = useState<AdminJournalArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminJournalArticle | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<JournalFormState>(EMPTY_FORM)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setArticles(await adminApi.listArticles())
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
        const data = await adminApi.listArticles()
        if (!cancelled) setArticles(data)
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

  const openEdit = (article: AdminJournalArticle) => {
    setEditing(article)
    setForm({
      slug: article.slug,
      titleAr: article.titleAr,
      titleEn: article.titleEn,
      excerptAr: article.excerptAr,
      excerptEn: article.excerptEn,
      contentAr: joinParagraphs(article.contentAr),
      contentEn: joinParagraphs(article.contentEn),
      category: article.category,
      author: article.author,
      readTime: article.readTime,
      publishDate: article.publishDate,
      imageUrl: article.imageUrl,
      isFeatured: article.isFeatured,
      isPublished: article.isPublished,
    })
    setFormOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.titleEn.trim()) {
      toast.error('أدخل عنوان المقال بالإنجليزية.')
      return
    }
    if (!form.publishDate) {
      toast.error('حدد تاريخ نشر المقال.')
      return
    }
    const slug = form.slug.trim() || toSlug(form.titleEn) || toSlug(form.titleAr)
    if (!slug) {
      toast.error('أدخل عنواناً لتوليد معرّف المقال.')
      return
    }
    const slugTaken = !editing && articles.some((article) => article.slug === slug)
    if (slugTaken) {
      toast.error('معرّف المقال مستخدم مسبقاً — اختر معرّفاً مختلفاً (slug).')
      return
    }
    const payload: AdminJournalWrite = {
      slug,
      titleEn: form.titleEn.trim(),
      titleAr: form.titleAr.trim(),
      excerptEn: form.excerptEn,
      excerptAr: form.excerptAr,
      contentEn: splitParagraphs(form.contentEn),
      contentAr: splitParagraphs(form.contentAr),
      category: form.category.trim() || 'المدونة',
      author: form.author.trim() || 'فريق شيلايت',
      readTime: form.readTime.trim() || 'قراءة 5 دقائق',
      publishDate: form.publishDate,
      imageUrl: form.imageUrl.trim(),
      isFeatured: form.isFeatured,
      isPublished: form.isPublished,
    }
    setSaving(true)
    try {
      if (editing) {
        await adminApi.updateArticle(editing.id, payload)
        toast.success('تم حفظ التعديلات')
      } else {
        await adminApi.createArticle(payload)
        toast.success('تم إنشاء المقال')
      }
      setFormOpen(false)
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /** تبديل النشر/الإخفاء دون إعادة فتح النموذج. */
  const togglePublished = async (article: AdminJournalArticle) => {
    setBusyId(article.id)
    try {
      const updated = await adminApi.patchArticle(article.id, {
        isPublished: !article.isPublished,
      })
      setArticles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(updated.isPublished ? 'المقال منشور الآن' : 'المقال مخفي من المدونة')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  /** تمييز المقال لبطاقة «المقال المميز» أعلى المدونة. */
  const toggleFeatured = async (article: AdminJournalArticle) => {
    setBusyId(article.id)
    try {
      const updated = await adminApi.patchArticle(article.id, {
        isFeatured: !article.isFeatured,
      })
      setArticles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(updated.isFeatured ? 'تم تمييز المقال' : 'تم إلغاء تمييز المقال')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleHide = async (article: AdminJournalArticle) => {
    const label = article.titleAr || article.titleEn
    if (!confirm(`إخفاء مقال «${label}» من المدونة؟`)) return
    try {
      await adminApi.deleteArticle(article.id)
      toast.success('تم إخفاء المقال')
      void load()
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  const sorted = useMemo(
    () => [...articles].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)),
    [articles]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          المقالات المنشورة تظهر في صفحة «المدونة» — والمقال المميز يتصدّر ببطاقة كبيرة، والباقي
          مرتّب بالأحدث.
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة مقال
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <p className="text-sm text-muted">جارٍ تحميل المقالات…</p>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <Newspaper className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="text-sm text-muted">لا توجد مقالات بعد.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-right text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-3 font-medium">المقال</th>
                  <th className="px-4 py-3 font-medium">التصنيف والكاتب</th>
                  <th className="px-4 py-3 font-medium">النشر</th>
                  <th className="px-4 py-3 font-medium">مميز</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((article) => {
                  const isBusy = busyId === article.id
                  return (
                    <tr
                      key={article.id}
                      className={cn(
                        'border-b border-border/60 last:border-0',
                        !article.isPublished && 'bg-muted/40 opacity-70'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {article.imageUrl ? (
                            // روابط خارجية يكتبها المدير — لا نقيّدها بالنطاقات المعتمدة
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={article.imageUrl}
                              alt=""
                              className="h-12 w-16 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-accent/60 text-muted">
                              <Newspaper className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                          <div>
                            <p className="font-semibold text-plum">
                              {article.titleAr || article.titleEn}
                            </p>
                            <p dir="ltr" className="text-xs text-muted" style={{ textAlign: 'right' }}>
                              {article.titleEn} · {article.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted">{article.category}</p>
                        <p className="text-xs text-muted">{article.author}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted">{formatDate(article.publishDate)}</p>
                        <p className="text-xs text-muted">{article.readTime}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={article.isFeatured ? 'إلغاء التمييز' : 'تمييز المقال'}
                          disabled={isBusy}
                          onClick={() => void toggleFeatured(article)}
                        >
                          <Star
                            className={cn(
                              'h-4 w-4',
                              article.isFeatured ? 'fill-amber-400 text-amber-500' : 'text-muted'
                            )}
                            aria-hidden="true"
                          />
                        </Button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void togglePublished(article)}
                          aria-label={article.isPublished ? 'إخفاء المقال' : 'نشر المقال'}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                            article.isPublished
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          )}
                        >
                          {article.isPublished ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {article.isPublished ? 'منشور' : 'مخفي'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(article)}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            تعديل
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={article.isPublished ? 'إخفاء' : 'منشور'}
                            onClick={() => void handleHide(article)}
                          >
                            {article.isPublished ? (
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
        <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border py-5 pl-6 pr-12 text-right sm:text-right">
            <DialogTitle className="text-xl">{editing ? 'تعديل مقال' : 'مقال جديد'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'عدّل المحتوى ثم احفظ — يظهر التحديث فوراً في المدونة.'
                : 'اكتب مقالاً بالعربية أو الإنجليزية — الفقرات تُفصل بسطر فارغ.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <section className="space-y-3">
                <Label className="text-base">المعلومات الأساسية</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="j-title-ar">العنوان بالعربية</Label>
                    <Input
                      id="j-title-ar"
                      value={form.titleAr}
                      onChange={(e) => setForm((prev) => ({ ...prev, titleAr: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="j-title-en">العنوان بالإنجليزية</Label>
                    <Input
                      id="j-title-en"
                      dir="ltr"
                      value={form.titleEn}
                      onChange={(e) => setForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="j-slug">المعرّف (slug)</Label>
                    <Input
                      id="j-slug"
                      dir="ltr"
                      placeholder="يُولّد تلقائياً إن تُرك فارغاً"
                      value={form.slug}
                      onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="j-date">تاريخ النشر</Label>
                    <Input
                      id="j-date"
                      type="date"
                      dir="ltr"
                      value={form.publishDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, publishDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="j-category">التصنيف</Label>
                    <Input
                      id="j-category"
                      value={form.category}
                      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="j-author">الكاتب</Label>
                    <Input
                      id="j-author"
                      value={form.author}
                      onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="j-read">مدة القراءة</Label>
                    <Input
                      id="j-read"
                      value={form.readTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, readTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_11rem] sm:items-start">
                  <div className="space-y-1.5">
                    <Label htmlFor="j-image">رابط الصورة (اختياري)</Label>
                    <Input
                      id="j-image"
                      dir="ltr"
                      placeholder="https://…"
                      value={form.imageUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    />
                    <p className="text-xs text-muted">
                      رابط صورة خارجي — تظهر في بطاقة المقال بالمدونة.
                    </p>
                  </div>
                  <div className="h-24 w-full overflow-hidden rounded-xl border border-border bg-muted/30">
                    {form.imageUrl.trim() ? (
                      // روابط خارجية يكتبها المدير — لا نقيّدها بالنطاقات المعتمدة
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
                        <Newspaper className="h-5 w-5" aria-hidden="true" />
                        <span className="text-[11px]">معاينة الصورة</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <Label className="text-base">المقدمة</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="j-excerpt-ar">بالعربية (اختياري)</Label>
                    <Textarea
                      id="j-excerpt-ar"
                      rows={3}
                      value={form.excerptAr}
                      onChange={(e) => setForm((prev) => ({ ...prev, excerptAr: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="j-excerpt-en">بالإنجليزية (اختياري)</Label>
                    <Textarea
                      id="j-excerpt-en"
                      rows={3}
                      dir="ltr"
                      value={form.excerptEn}
                      onChange={(e) => setForm((prev) => ({ ...prev, excerptEn: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-base">المحتوى</Label>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>{splitParagraphs(form.contentAr).length} فقرة عربية</span>
                    <span className="h-3 w-px bg-border" aria-hidden="true" />
                    <span>{splitParagraphs(form.contentEn).length} فقرة إنجليزية</span>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="j-content-ar">بالعربية</Label>
                    <Textarea
                      id="j-content-ar"
                      rows={10}
                      placeholder="افصل بين الفقرات بسطر فارغ"
                      value={form.contentAr}
                      onChange={(e) => setForm((prev) => ({ ...prev, contentAr: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="j-content-en">بالإنجليزية</Label>
                    <Textarea
                      id="j-content-en"
                      rows={10}
                      dir="ltr"
                      placeholder="Separate paragraphs with a blank line"
                      value={form.contentEn}
                      onChange={(e) => setForm((prev) => ({ ...prev, contentEn: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isPublished}
                  onClick={() => setForm((prev) => ({ ...prev, isPublished: !prev.isPublished }))}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    form.isPublished
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-surface'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      form.isPublished ? 'bg-primary/15 text-primary' : 'bg-muted text-muted'
                    )}
                  >
                    {form.isPublished ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-charcoal">منشور في المدونة</span>
                    <span className="block text-xs text-muted">يظهر للزوار فوراً بعد الحفظ.</span>
                  </span>
                  <span
                    className={cn(
                      'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                      form.isPublished ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all',
                        form.isPublished ? 'right-0.5' : 'right-4'
                      )}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isFeatured}
                  onClick={() => setForm((prev) => ({ ...prev, isFeatured: !prev.isFeatured }))}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    form.isFeatured ? 'border-amber-300 bg-amber-50' : 'border-border bg-surface'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      form.isFeatured ? 'bg-amber-100 text-amber-500' : 'bg-muted text-muted'
                    )}
                  >
                    <Star
                      className={cn('h-4 w-4', form.isFeatured && 'fill-amber-400')}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-charcoal">مقال مميز</span>
                    <span className="block text-xs text-muted">يتصدّر ببطاقة كبيرة أعلى المدونة.</span>
                  </span>
                  <span
                    className={cn(
                      'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                      form.isFeatured ? 'bg-amber-400' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all',
                        form.isFeatured ? 'right-0.5' : 'right-4'
                      )}
                    />
                  </span>
                </button>
              </div>
            </div>

            <div className="border-t border-border bg-muted/30 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 font-medium',
                      form.isPublished
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    )}
                  >
                    {form.isPublished ? 'منشور' : 'مخفي'}
                  </span>
                  {form.isFeatured && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                      مميز
                    </span>
                  )}
                  {form.publishDate && <span className="text-muted">{formatDate(form.publishDate)}</span>}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {editing ? 'حفظ التعديلات' : 'إنشاء المقال'}
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
