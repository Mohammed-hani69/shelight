'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/features/admin/components/error-state'
import { adminApi, formatAmount } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import type { AdminProduct } from '@/types/admin'
import type { BackendMeta } from '@/lib/api/backend-mappers'

function InventoryBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">نفذت الكمية</span>
  }
  if (stock <= 5) {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">مخزون منخفض</span>
  }
  return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">متوفر</span>
}

export function ProductsTable() {
  const router = useRouter()
  const [items, setItems] = useState<AdminProduct[]>([])
  const [meta, setMeta] = useState<BackendMeta | null>(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async (page = 1, term = query) => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.listProducts({ page, search: term || undefined })
      setItems(res.items)
      setMeta(res.meta ?? null)
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
        const res = await adminApi.listProducts({})
        if (!cancelled) {
          setItems(res.items)
          setMeta(res.meta ?? null)
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

  const handleHide = async (product: AdminProduct) => {
    if (!confirm(`إخفاء المنتج «${product.name}» عن المتجر؟`)) return
    try {
      await adminApi.deleteProduct(product.id)
      toast.success('تم إخفاء المنتج')
      void load(meta?.page ?? 1)
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="flex flex-1 gap-2 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault()
            setQuery(search)
            void load(1, search)
          }}
        >
          <Input
            placeholder="ابحث بالاسم أو Slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" size="icon" variant="secondary" aria-label="بحث">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة منتج
          </Button>
        </Link>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load(meta?.page ?? 1)} />}

      {loading ? (
        <p className="text-sm text-muted">جارٍ تحميل المنتجات…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <Package className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="text-sm text-muted">لا توجد منتجات مطابقة.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-3 font-medium">المنتج</th>
                  <th className="px-4 py-3 font-medium">السعر</th>
                  <th className="px-4 py-3 font-medium">المخزون</th>
                  <th className="px-4 py-3 font-medium">التقييم</th>
                  <th className="px-4 py-3 font-medium">أعلام</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0]?.url ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            width={44}
                            height={44}
                            unoptimized
                            className="h-11 w-11 rounded-lg border border-border object-cover"
                          />
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/40 text-muted">
                            <Package className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="block truncate font-medium text-charcoal hover:text-primary"
                          >
                            {product.name}
                          </Link>
                          <p className="truncate text-xs text-muted" dir="ltr">
                            {product.sku} · {product.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{formatAmount(product.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.stock}</span>
                        <InventoryBadge stock={product.stock} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {product.rating ? `${product.rating.toFixed(1)} ★ (${product.reviewCount})` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {product.featured && (
                          <span className="rounded-full bg-plum/10 px-2 py-0.5 text-xs font-medium text-plum">مميز</span>
                        )}
                        {product.isBestseller && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">الأكثر مبيعاً</span>
                        )}
                        {product.isNew && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">جديد</span>
                        )}
                        {!product.isActive && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">مخفي</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="تعديل"
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label="إخفاء" onClick={() => void handleHide(product)}>
                          <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted">
                صفحة {meta.page} من {meta.totalPages} — {meta.total} عنصراً
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(meta.page ?? 1) <= 1 || loading}
                  onClick={() => void load((meta.page ?? 1) - 1)}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  السابقة
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasNextPage || loading}
                  onClick={() => void load((meta.page ?? 1) + 1)}
                >
                  التالية
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}