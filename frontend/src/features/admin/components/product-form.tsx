'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ImagePlus, Loader2, Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { adminApi } from '@/features/admin/services/admin-api'
import { productApi } from '@/features/products/services/product-api'
import { friendlyMessage } from '@/lib/api/errors'
import type { AdminProduct, AdminProductWrite } from '@/types/admin'
import type { Category } from '@/types/product'

interface FaqRow {
  question: string
  answer: string
}

interface ImageRow {
  url: string
  alt_en: string
  alt_ar: string
}

interface FormState {
  slug: string
  sku: string
  name_en: string
  name_ar: string
  short_description_en: string
  short_description_ar: string
  description_en: string
  description_ar: string
  price: string
  compare_at_price: string
  stock: string
  category_slug: string
  tags: string
  concerns: string
  benefits: string
  ingredients: string
  howToUse: string
  suitableFor: string
  isFeatured: boolean
  isBestseller: boolean
  isNew: boolean
  isActive: boolean
  images: ImageRow[]
  faqs: FaqRow[]
}

const EMPTY_FORM: FormState = {
  slug: '',
  sku: '',
  name_en: '',
  name_ar: '',
  short_description_en: '',
  short_description_ar: '',
  description_en: '',
  description_ar: '',
  price: '',
  compare_at_price: '',
  stock: '0',
  category_slug: '',
  tags: '',
  concerns: '',
  benefits: '',
  ingredients: '',
  howToUse: '',
  suitableFor: '',
  isFeatured: false,
  isBestseller: false,
  isNew: false,
  isActive: true,
  images: [{ url: '', alt_en: '', alt_ar: '' }],
  faqs: [],
}

const LIST_TEXTAREA_FIELDS = ['benefits', 'ingredients', 'howToUse', 'suitableFor'] as const

/** يحوّل منتجاً محمَّلاً إلى حالة النموذج — يُستخدم عند التحرير. */
function toFormState(product: AdminProduct): FormState {
  return {
    slug: product.slug,
    sku: product.sku ?? '',
    name_en: product.nameEn ?? product.name,
    name_ar: product.nameAr ?? '',
    short_description_en: product.shortDescriptionEn ?? '',
    short_description_ar: product.shortDescriptionAr ?? '',
    description_en: product.descriptionEn ?? '',
    description_ar: product.descriptionAr ?? '',
    price: product.price ? String(product.price) : '',
    compare_at_price: product.compareAtPrice ? String(product.compareAtPrice) : '',
    stock: product.stock !== undefined ? String(product.stock) : '0',
    category_slug: product.categorySlug ?? '',
    tags: (product.tags ?? []).join(', '),
    concerns: (product.concernSlugs ?? []).join(', '),
    benefits: (product.benefits ?? []).join('\n'),
    ingredients: (product.ingredients ?? []).join('\n'),
    howToUse: (product.howToUse ?? []).join('\n'),
    suitableFor: (product.suitableFor ?? []).join('\n'),
    isFeatured: Boolean(product.featured),
    isBestseller: Boolean(product.isBestseller),
    isNew: Boolean(product.isNew),
    isActive: product.isActive !== false,
    images:
      (product.images ?? []).length > 0
        ? product.images.map((image) => ({ url: image.url, alt_en: '', alt_ar: '' }))
        : [{ url: '', alt_en: '', alt_ar: '' }],
    faqs: product.faqs?.map((faq) => ({ question: faq.question, answer: faq.answer })) ?? [],
  }
}

interface ProductFormProps {
  /** عند التحرير يُمرَّر المنتج المحمَّل؛ عند الإنشاء يُترك بلا قيمة. */
  product?: AdminProduct
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const isEditing = Boolean(product)
  // المنتج لا يتغيّر بعد التركيب (صفحة التحرير تُرسم فقط بعد اكتمال التحميل)،
  // لذلك نُهيئ الحالة مرة واحدة ولا نعيد مزامنتها في effect.
  const [form, setForm] = useState<FormState>(() => (product ? toFormState(product) : EMPTY_FORM))
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    productApi
      .categories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false))
  }, [])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const splitLines = (value: string): string[] =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

  const splitComma = (value: string): string[] =>
    value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

  const buildPayload = (): AdminProductWrite => ({
    slug: form.slug.trim(),
    sku: form.sku.trim(),
    name_en: form.name_en.trim(),
    name_ar: form.name_ar.trim(),
    short_description_en: form.short_description_en.trim(),
    short_description_ar: form.short_description_ar.trim(),
    description_en: form.description_en.trim(),
    description_ar: form.description_ar.trim(),
    price: form.price,
    compare_at_price: form.compare_at_price || null,
    stock: Number(form.stock) || 0,
    tags: splitComma(form.tags),
    category_slug: form.category_slug || null,
    concerns: splitComma(form.concerns),
    images: form.images.filter((image) => image.url.trim()),
    benefits: splitLines(form.benefits),
    ingredients: splitLines(form.ingredients),
    howToUse: splitLines(form.howToUse),
    suitableFor: splitLines(form.suitableFor),
    faqs: form.faqs.filter((faq) => faq.question.trim() || faq.answer.trim()),
    variants: product?.variants ?? [],
    isFeatured: form.isFeatured,
    isBestseller: form.isBestseller,
    isNew: form.isNew,
    isActive: form.isActive,
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name_en.trim() || !form.price) {
      toast.error('الاسم الإنجليزي والسعر حقلان إجباريان.')
      return
    }
    setSubmitting(true)
    try {
      if (isEditing && product) {
        await adminApi.updateProduct(product.id, buildPayload())
        toast.success('تم تحديث المنتج')
      } else {
        await adminApi.createProduct(buildPayload())
        toast.success('تم إنشاء المنتج')
      }
      router.replace('/admin/products')
    } catch (error) {
      toast.error(friendlyMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-plum">المعلومات الأساسية</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name_en">
              الاسم (إنجليزي) <span className="text-danger">*</span>
            </Label>
            <Input id="name_en" value={form.name_en} onChange={(e) => setField('name_en', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name_ar">الاسم (عربي)</Label>
            <Input id="name_ar" value={form.name_ar} onChange={(e) => setField('name_ar', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">
              Slug <span className="text-danger">*</span>
            </Label>
            <Input id="slug" dir="ltr" value={form.slug} onChange={(e) => setField('slug', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku">
              SKU <span className="text-danger">*</span>
            </Label>
            <Input id="sku" dir="ltr" value={form.sku} onChange={(e) => setField('sku', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-plum">التسعير والمخزون</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">السعر (LE) — إجباري</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compare_at_price">السعر قبل الخصم</Label>
            <Input
              id="compare_at_price"
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              value={form.compare_at_price}
              onChange={(e) => setField('compare_at_price', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">المخزون</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              dir="ltr"
              value={form.stock}
              onChange={(e) => setField('stock', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-plum">التصنيف والوصف</h2>
        <div className="space-y-1.5 md:max-w-sm">
          <Label htmlFor="category_slug">الفئة</Label>
          <select
            id="category_slug"
            className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            disabled={loadingCategories}
            value={form.category_slug}
            onChange={(e) => setField('category_slug', e.target.value)}
          >
            <option value="">بدون فئة</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ['short_description_en', 'الوصف المختصر (إنجليزي)'],
              ['short_description_ar', 'الوصف المختصر (عربي)'],
              ['description_en', 'الوصف الكامل (إنجليزي)'],
              ['description_ar', 'الوصف الكامل (عربي)'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Textarea id={key} rows={key.startsWith('description') ? 5 : 2} value={form[key]} onChange={(e) => setField(key, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tags">وسوم (مفصولة بفواصل)</Label>
            <Input id="tags" dir="ltr" value={form.tags} onChange={(e) => setField('tags', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="concerns">Slug الاهتمامات (مفصولة بفواصل)</Label>
            <Input id="concerns" dir="ltr" value={form.concerns} onChange={(e) => setField('concerns', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-plum">قوائم المحتوى — سطر لكل عنصر</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(LIST_TEXTAREA_FIELDS as readonly string[]).map((key) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`list-${key}`}>
                {{
                  benefits: 'المزايا',
                  ingredients: 'المكونات',
                  howToUse: 'طريقة الاستخدام',
                  suitableFor: 'مناسب لـ',
                }[key]}
              </Label>
              <Textarea
                id={`list-${key}`}
                rows={4}
                dir="ltr"
                value={form[key as keyof Pick<FormState, (typeof LIST_TEXTAREA_FIELDS)[number]>]}
                onChange={(e) => setField(key as keyof FormState, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-plum">الصور</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setField('images', [...form.images, { url: '', alt_en: '', alt_ar: '' }])}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة صورة
          </Button>
        </div>
        {form.images.map((image, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center">
            {image.url ? (
              <Image
                src={image.url}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 rounded-lg border border-border object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/40 text-muted">
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <Input
              dir="ltr"
              className="flex-1"
              placeholder="رابط الصورة https://…"
              value={image.url}
              onChange={(e) => {
                const next = [...form.images]
                next[index] = { ...image, url: e.target.value }
                setField('images', next)
              }}
            />
            <Input
              className="sm:w-40"
              placeholder="alt عربي"
              value={image.alt_ar}
              onChange={(e) => {
                const next = [...form.images]
                next[index] = { ...image, alt_ar: e.target.value }
                setField('images', next)
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="حذف الصورة"
              disabled={form.images.length === 1}
              onClick={() => setField('images', form.images.filter((_, i) => i !== index))}
            >
              <X className="h-4 w-4 text-danger" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-plum">الأسئلة الشائعة</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setField('faqs', [...form.faqs, { question: '', answer: '' }])}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة سؤال
          </Button>
        </div>
        {form.faqs.length === 0 && <p className="text-sm text-muted">لا توجد أسئلة بعد.</p>}
        {form.faqs.map((faq, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 md:flex-row">
            <Input
              className="flex-1"
              placeholder="السؤال"
              value={faq.question}
              onChange={(e) => {
                const next = [...form.faqs]
                next[index] = { ...faq, question: e.target.value }
                setField('faqs', next)
              }}
            />
            <Input
              className="flex-[2]"
              placeholder="الإجابة"
              value={faq.answer}
              onChange={(e) => {
                const next = [...form.faqs]
                next[index] = { ...faq, answer: e.target.value }
                setField('faqs', next)
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="حذف السؤال"
              onClick={() => setField('faqs', form.faqs.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-plum">الحالة والعرض</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['isFeatured', 'مميز', 'يظهر في قسم المنتجات المميزة'],
              ['isBestseller', 'الأكثر مبيعاً', 'يظهر في قسم الأكثر مبيعاً'],
              ['isNew', 'جديد', 'يظهر في قسم الوصولات الجديدة'],
              ['isActive', 'نشط', 'ظاهر في المتجر'],
            ] as const
          ).map(([key, label, hint]) => (
            <label key={key} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
              <Checkbox
                checked={form[key]}
                onCheckedChange={(checked) => setField(key, Boolean(checked))}
              />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted">{hint}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          إلغاء
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          <Save className="h-4 w-4" aria-hidden="true" />
          {isEditing ? 'حفظ التعديلات' : 'إنشاء المنتج'}
        </Button>
      </div>
    </form>
  )
}