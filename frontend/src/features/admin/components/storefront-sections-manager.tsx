'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Megaphone, Save, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi } from '@/features/admin/services/admin-api'
import { marketingSectionsService, type StorefrontSectionContent } from '@/features/marketing-sections/marketing-sections-service'
import { friendlyMessage } from '@/lib/api/errors'
import { resolveMediaUrl } from '@/lib/api/media'
import type { AdminProduct } from '@/types/admin'

const SECTION_KEY = 'offers_popup'
const EMPTY_SECTION: StorefrontSectionContent = {
  key: SECTION_KEY,
  type: 'product_offer_popup',
  isActive: false,
  title: 'عروض مختارة لكِ',
  description: 'اكتشفي منتجاتك المفضلة بأسعار خاصة.',
  productIds: [],
}

export function StorefrontSectionsManager() {
  const [section, setSection] = useState(EMPTY_SECTION)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      marketingSectionsService.getAdminSection(SECTION_KEY),
      adminApi.listProducts({ pageSize: 100 }),
    ])
      .then(([savedSection, productPage]) => {
        if (cancelled) return
        setSection({ ...EMPTY_SECTION, ...savedSection })
        setProducts(productPage.items)
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const offerProducts = useMemo(
    () => products.filter((product) => product.isActive !== false && product.compareAtPrice != null && product.compareAtPrice > product.price),
    [products],
  )
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return query
      ? offerProducts.filter((product) => product.name.toLocaleLowerCase().includes(query))
      : offerProducts
  }, [offerProducts, search])

  const toggleProduct = (productId: string, checked: boolean) => {
    const id = Number(productId)
    setSection((current) => ({
      ...current,
      productIds: checked
        ? [...new Set([...current.productIds, id])]
        : current.productIds.filter((selectedId) => selectedId !== id),
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const saved = await marketingSectionsService.saveAdminSection(SECTION_KEY, {
        sectionType: section.type,
        isActive: section.isActive,
        title: section.title,
        description: section.description,
        productIds: section.productIds,
      })
      setSection({ ...EMPTY_SECTION, ...saved })
      toast.success('تم حفظ إعدادات نافذة العروض')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">جارٍ تحميل أقسام واجهة المتجر…</p>
  }

  return (
    <div className="space-y-6">
      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

      <section className="space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/40 text-primary">
              <Megaphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-plum">نافذة عروض المنتجات</h2>
              <p className="mt-1 text-sm text-muted">تظهر مرة واحدة للزائر في كل جلسة، وتعرض المنتجات التي عليها خصم فعلي.</p>
            </div>
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <Checkbox
              checked={section.isActive}
              onCheckedChange={(checked) => setSection((current) => ({ ...current, isActive: checked === true }))}
            />
            <span>تفعيل النافذة</span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="offers-title">عنوان النافذة</Label>
            <Input id="offers-title" value={section.title} onChange={(event) => setSection((current) => ({ ...current, title: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offers-description">وصف مختصر</Label>
            <Input id="offers-description" value={section.description} onChange={(event) => setSection((current) => ({ ...current, description: event.target.value }))} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Label>المنتجات المعروضة</Label>
              <p className="mt-1 text-xs text-muted">اختيار المنتجات ذات سعر مقارنة أعلى من سعر البيع.</p>
            </div>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحثي عن منتج" className="pr-9" />
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              {offerProducts.length ? 'لا توجد منتجات مطابقة للبحث.' : 'لا توجد منتجات نشطة عليها خصم حاليًا.'}
            </p>
          ) : (
            <div className="max-h-[420px] divide-y divide-border overflow-y-auto border-y border-border">
              {filteredProducts.map((product) => {
                const selected = section.productIds.includes(Number(product.id))
                return (
                  <label key={product.id} className="flex cursor-pointer items-center gap-3 py-3">
                    <Checkbox checked={selected} onCheckedChange={(checked) => toggleProduct(product.id, checked === true)} />
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-background">
                      {product.images[0]?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveMediaUrl(product.images[0].url)} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-charcoal">{product.name}</span>
                      <span className="mt-1 flex items-center gap-2 text-xs">
                        <span className="font-semibold text-primary-dark">{product.price.toLocaleString('ar-EG')} ج.م</span>
                        <s className="text-muted">{product.compareAtPrice?.toLocaleString('ar-EG')} ج.م</s>
                      </span>
                    </span>
                    {selected && <Check className="h-4 w-4 text-success" aria-hidden="true" />}
                  </label>
                )
              })}
            </div>
          )}
          <p className="text-xs text-muted">تم اختيار {section.productIds.length} منتجًا</p>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            حفظ القسم
          </Button>
        </div>
      </section>
    </div>
  )
}
