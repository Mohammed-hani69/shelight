'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminImageUpload } from '@/features/admin/components/admin-image-upload'
import { ErrorState } from '@/features/admin/components/error-state'
import {
  customerTrustService,
  EMPTY_CUSTOMER_TRUST_SECTION,
  type CustomerTrustSection,
} from '@/features/customer-trust/customer-trust-service'
import { friendlyMessage } from '@/lib/api/errors'

interface ManagedImage {
  key: string
  title: string
  url: string
}

let nextDraftImageKey = 0

export function CustomerTrustManager() {
  const [section, setSection] = useState<CustomerTrustSection>(EMPTY_CUSTOMER_TRUST_SECTION)
  const [images, setImages] = useState<ManagedImage[]>([])
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    customerTrustService
      .getAdminSection()
      .then((content) => {
        if (!active) return
        setSection({ ...EMPTY_CUSTOMER_TRUST_SECTION, ...content })
        setImages(content.images.map((image, index) => ({ ...image, key: `saved-${index}-${image.url}` })))
      })
      .catch((err) => {
        if (active) setError(friendlyMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const updateImage = (key: string, changes: Partial<ManagedImage>) => {
    setImages((current) => current.map((image) => image.key === key ? { ...image, ...changes } : image))
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    setImages((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const save = async () => {
    if (uploadingKeys.size > 0) return
    if (images.length > 30) {
      toast.error('يمكن إضافة 30 صورة كحد أقصى.')
      return
    }
    if (images.some((image) => !image.url || !image.title.trim())) {
      toast.error('ارفع كل الصور وأضف وصفًا لكل صورة قبل الحفظ.')
      return
    }

    setSaving(true)
    try {
      const saved = await customerTrustService.saveAdminSection({
        ...section,
        images: images.map(({ title, url }) => ({ title: title.trim(), url })),
      })
      setSection(saved)
      setImages(saved.images.map((image, index) => ({ ...image, key: `saved-${index}-${image.url}` })))
      toast.success('تم حفظ قسم ثقة العملاء')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted">جارٍ تحميل قسم ثقة العملاء…</p>

  return (
    <section className="space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/40 text-primary">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-plum">ثقة عملائنا فينا</h2>
            <p className="mt-1 text-sm text-muted">اعرضي صور تجارب وآراء العميلات في كاروسيل متحرك على الصفحة الرئيسية.</p>
          </div>
        </div>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Checkbox
            checked={section.isActive}
            onCheckedChange={(checked) => setSection((current) => ({ ...current, isActive: checked === true }))}
          />
          <span>تفعيل القسم</span>
        </label>
      </div>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer-trust-title">عنوان القسم</Label>
          <Input
            id="customer-trust-title"
            value={section.title}
            onChange={(event) => setSection((current) => ({ ...current, title: event.target.value }))}
            maxLength={160}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-trust-description">وصف مختصر</Label>
          <Input
            id="customer-trust-description"
            value={section.description}
            onChange={(event) => setSection((current) => ({ ...current, description: event.target.value }))}
            maxLength={500}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-plum">صور العملاء</h3>
            <p className="mt-1 text-xs text-muted">أضيفي وصفًا قصيرًا لكل صورة؛ سيظهر أسفلها ويُستخدم كنص بديل.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={images.length >= 30}
            onClick={() => {
              nextDraftImageKey += 1
              setImages((current) => [...current, { key: `draft-${nextDraftImageKey}`, title: '', url: '' }])
            }}
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            إضافة صورة
          </Button>
        </div>

        {images.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            لم تتم إضافة صور بعد.
          </p>
        ) : (
          <div className="space-y-4">
            {images.map((image, index) => (
              <div key={image.key} className="rounded-lg border border-border p-3 sm:p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminImageUpload
                    id={`customer-trust-image-${image.key}`}
                    label={`الصورة ${index + 1}`}
                    value={image.url}
                    uploadImage={customerTrustService.uploadImage}
                    onChange={(url) => updateImage(image.key, { url })}
                    onUploadingChange={(uploading) => {
                      setUploadingKeys((current) => {
                        const next = new Set(current)
                        if (uploading) next.add(image.key)
                        else next.delete(image.key)
                        return next
                      })
                    }}
                  />
                  <div className="space-y-2">
                    <Label htmlFor={`customer-trust-title-${image.key}`}>وصف الصورة</Label>
                    <Input
                      id={`customer-trust-title-${image.key}`}
                      value={image.title}
                      onChange={(event) => updateImage(image.key, { title: event.target.value })}
                      maxLength={160}
                      placeholder="مثال: تجربة عميلة"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="تحريك الصورة لأعلى"
                    disabled={index === 0}
                    onClick={() => moveImage(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="تحريك الصورة لأسفل"
                    disabled={index === images.length - 1}
                    onClick={() => moveImage(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="حذف الصورة"
                    onClick={() => setImages((current) => current.filter((item) => item.key !== image.key))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || uploadingKeys.size > 0 || Boolean(error)}
        >
          {saving
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : <Save className="h-4 w-4" aria-hidden="true" />}
          حفظ القسم
        </Button>
      </div>
    </section>
  )
}
