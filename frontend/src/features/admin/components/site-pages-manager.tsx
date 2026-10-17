'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AdminImageUpload } from '@/features/admin/components/admin-image-upload'
import { ErrorState } from '@/features/admin/components/error-state'
import {
  DEFAULT_SITE_PAGES,
  sitePagesService,
  type SitePageContent,
  type SitePageItem,
  type SitePageKey,
} from '@/features/site-pages/site-pages-service'
import { friendlyMessage } from '@/lib/api/errors'

const PAGE_OPTIONS: Array<{ key: SitePageKey; label: string }> = [
  { key: 'about', label: 'من نحن' },
  { key: 'shipping-returns', label: 'الشحن والإرجاع' },
  { key: 'contact', label: 'تواصل معنا' },
  { key: 'faq', label: 'الأسئلة الشائعة' },
]

const EMPTY_ITEM: SitePageItem = { title: '', body: '', detail: '', kind: '' }

export function SitePagesManager() {
  const [pageKey, setPageKey] = useState<SitePageKey>('about')
  const [page, setPage] = useState<SitePageContent>(DEFAULT_SITE_PAGES.about)
  const [loadedPageKey, setLoadedPageKey] = useState<SitePageKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loading = loadedPageKey !== pageKey

  useEffect(() => {
    let active = true
    sitePagesService
      .getAdminPage(pageKey)
      .then((savedPage) => {
        if (active) setPage({ ...DEFAULT_SITE_PAGES[pageKey], ...savedPage, key: pageKey })
      })
      .catch((cause) => {
        if (active) setError(friendlyMessage(cause))
      })
      .finally(() => {
        if (active) setLoadedPageKey(pageKey)
      })
    return () => {
      active = false
    }
  }, [pageKey])

  const updatePage = <K extends keyof SitePageContent>(key: K, value: SitePageContent[K]) => {
    setPage((current) => ({ ...current, [key]: value }))
  }

  const updateItem = <K extends keyof SitePageItem>(index: number, key: K, value: SitePageItem[K]) => {
    setPage((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }))
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        eyebrow: page.eyebrow,
        title: page.title,
        description: page.description,
        imageUrl: page.imageUrl,
        imageAlt: page.imageAlt,
        items: page.items,
      }
      const saved = await sitePagesService.saveAdminPage(pageKey, payload)
      setPage({ ...DEFAULT_SITE_PAGES[pageKey], ...saved })
      toast.success(`تم حفظ صفحة ${PAGE_OPTIONS.find((option) => option.key === pageKey)?.label}`)
    } catch (cause) {
      toast.error(friendlyMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const isContact = pageKey === 'contact'
  const isFaq = pageKey === 'faq'
  const isAbout = pageKey === 'about'

  return (
    <div className="space-y-5">
      <Tabs
        value={pageKey}
        onValueChange={(value) => {
          setError(null)
          setPageKey(value as SitePageKey)
        }}
      >
        <TabsList className="h-auto flex-wrap justify-start rounded-lg">
          {PAGE_OPTIONS.map((option) => (
            <TabsTrigger key={option.key} value={option.key}>{option.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : loading ? (
        <p className="text-sm text-muted">جارٍ تحميل محتوى الصفحة…</p>
      ) : (
        <form onSubmit={save} className="space-y-5">
          <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-plum">محتوى الصفحة</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="site-page-eyebrow">العنوان الصغير</Label>
                <Input id="site-page-eyebrow" maxLength={160} value={page.eyebrow} onChange={(event) => updatePage('eyebrow', event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site-page-title">العنوان الرئيسي</Label>
                <Input id="site-page-title" required maxLength={200} value={page.title} onChange={(event) => updatePage('title', event.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="site-page-description">الوصف</Label>
                <Textarea id="site-page-description" maxLength={2000} value={page.description} onChange={(event) => updatePage('description', event.target.value)} />
              </div>
            </div>
            {isAbout && (
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminImageUpload
                  id="site-page-image"
                  label="صورة الصفحة (رفع من الجهاز)"
                  value={page.imageUrl}
                  onChange={(value) => updatePage('imageUrl', value)}
                  onUploadingChange={setUploading}
                  uploadImage={(file) => sitePagesService.uploadAdminPageImage(pageKey, file)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="site-page-image-alt">وصف الصورة</Label>
                  <Input id="site-page-image-alt" maxLength={300} value={page.imageAlt} onChange={(event) => updatePage('imageAlt', event.target.value)} />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-plum">
                  {isFaq ? 'الأسئلة والإجابات' : isContact ? 'قنوات التواصل' : 'الأقسام'}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {isFaq ? 'أضيفي الأسئلة الشائعة وإجاباتها أو عدّليها.' : 'أضيفي محتوى الصفحة أو عدّليه.'}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => updatePage('items', [...page.items, { ...EMPTY_ITEM }])}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                إضافة {isFaq ? 'سؤال' : isContact ? 'قناة' : 'قسم'}
              </Button>
            </div>

            {page.items.map((item, index) => (
              <div key={index} className="space-y-3 rounded-md border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-charcoal">
                    {isFaq ? `السؤال ${index + 1}` : isContact ? `قناة التواصل ${index + 1}` : `القسم ${index + 1}`}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`حذف ${isFaq ? 'السؤال' : 'القسم'} ${index + 1}`}
                    onClick={() => updatePage('items', page.items.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`site-page-item-title-${index}`}>{isFaq ? 'السؤال' : 'العنوان'}</Label>
                    <Input
                      id={`site-page-item-title-${index}`}
                      required
                      maxLength={200}
                      value={item.title}
                      onChange={(event) => updateItem(index, 'title', event.target.value)}
                    />
                  </div>
                  {isContact && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`site-page-item-kind-${index}`}>رمز التواصل</Label>
                      <select
                        id={`site-page-item-kind-${index}`}
                        value={item.kind}
                        onChange={(event) => updateItem(index, 'kind', event.target.value as SitePageItem['kind'])}
                        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                      >
                        <option value="phone">هاتف</option>
                        <option value="email">بريد إلكتروني</option>
                        <option value="location">موقع</option>
                        <option value="clock">ساعات عمل</option>
                      </select>
                    </div>
                  )}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`site-page-item-body-${index}`}>{isFaq ? 'الإجابة' : isContact ? 'بيانات التواصل' : 'النص'}</Label>
                    <Textarea
                      id={`site-page-item-body-${index}`}
                      maxLength={5000}
                      value={item.body}
                      onChange={(event) => updateItem(index, 'body', event.target.value)}
                    />
                  </div>
                  {isContact && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor={`site-page-item-detail-${index}`}>تفاصيل إضافية</Label>
                      <Input
                        id={`site-page-item-detail-${index}`}
                        maxLength={1000}
                        value={item.detail}
                        onChange={(event) => updateItem(index, 'detail', event.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || uploading} className="min-h-11 w-full sm:w-auto">
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? 'جارٍ الحفظ…' : 'حفظ محتوى الصفحة'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
