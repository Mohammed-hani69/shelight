'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Banknote, Calculator, LoaderCircle, Package, Save, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminApi } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { formatPrice } from '@/lib/utils/format-price'
import type { AdminAccountingProduct, AdminAccountingReport } from '@/types/admin'

function formatAmount(value: number | null): string {
  return value == null ? '—' : formatPrice(value)
}

export function AccountingManager() {
  const [report, setReport] = useState<AdminAccountingReport | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReport = async (dates = { from: fromDate, to: toDate }) => {
    setLoading(true)
    setError(null)
    try {
      setReport(await adminApi.accounting(dates))
    } catch (loadError) {
      setError(friendlyMessage(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReport({ from: '', to: '' })
  }, [])

  const products = report?.products ?? []
  const selectedProduct = products.find(
    (product) => product.productId === selectedProductId
  )

  const selectProduct = (productId: string) => {
    setSelectedProductId(productId)
    const product = products.find((item) => item.productId === productId)
    setCostPrice(
      product?.currentCostPrice == null ? '' : String(product.currentCostPrice)
    )
  }

  const saveCost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedProductId) {
      toast.error('اختار المنتج الأول')
      return
    }
    const parsedCost = costPrice.trim() === '' ? null : Number(costPrice)
    if (parsedCost !== null && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      toast.error('اكتب تكلفة صحيحة، أو سيب الخانة فاضية لإزالة التكلفة')
      return
    }

    setSaving(true)
    try {
      await adminApi.updateProductCost(selectedProductId, parsedCost?.toFixed(2) ?? null)
      toast.success('اتحفظت تكلفة المنتج')
      await loadReport()
    } catch (saveError) {
      toast.error(friendlyMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const applyDateFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (fromDate && toDate && fromDate > toDate) {
      toast.error('تاريخ البداية لازم يكون قبل تاريخ النهاية')
      return
    }
    void loadReport({ from: fromDate, to: toDate })
  }

  const summary = report?.summary

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-plum">
            <Calculator className="h-5 w-5" aria-hidden="true" />
            سجّل تكلفة المنتجات
          </h2>
          <p className="mt-1 text-sm text-muted">
            التكلفة بتتسجل مع الطلبات الجديدة وقت الشراء، وتغييرها بعد كده مش هيغيّر حساب الطلبات القديمة.
          </p>
        </div>
        <form onSubmit={saveCost} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="accounting-product">المنتج</Label>
            <select
              id="accounting-product"
              value={selectedProductId}
              onChange={(event) => selectProduct(event.target.value)}
              className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <option value="">اختار المنتج</option>
              {products
                .filter((product) => product.productId !== null)
                .map((product) => (
                  <option key={product.productId} value={product.productId!}>
                    {product.name}{product.isActive ? '' : ' (مخفي)'}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accounting-cost">تكلفة الوحدة بالجنيه</Label>
            <Input
              id="accounting-cost"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={costPrice}
              onChange={(event) => setCostPrice(event.target.value)}
              placeholder="مثال: 125.50"
            />
          </div>
          <Button type="submit" disabled={saving || !selectedProduct}>
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            حفظ التكلفة
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold text-plum">فلترة الفترة</h2>
          <p className="mt-1 text-sm text-muted">
            الحسابات للطلبات المسلّمة فقط، حسب تاريخ تسجيل الطلب.
          </p>
        </div>
        <form onSubmit={applyDateFilter} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="accounting-from">من تاريخ</Label>
            <Input
              id="accounting-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accounting-to">لحد تاريخ</Label>
            <Input
              id="accounting-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>عرض الملخص</Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || (!fromDate && !toDate)}
              onClick={() => {
                setFromDate('')
                setToDate('')
                void loadReport({ from: '', to: '' })
              }}
            >
              الكل
            </Button>
          </div>
        </form>
      </section>

      {error ? (
        <section className="rounded-xl border border-danger/30 bg-danger/5 p-5 text-sm text-danger">
          <p>{error}</p>
          <Button className="mt-3" variant="outline" size="sm" onClick={() => void loadReport()}>
            جرّب تاني
          </Button>
        </section>
      ) : loading || !summary ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
          بنحمّل ملخص الحسابات...
        </p>
      ) : (
        <>
          {summary.unknownCostUnits > 0 && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-charcoal">
              فيه {summary.unknownCostUnits} وحدة مباعة تكلفتها مش متسجلة وقت الطلب؛ إجمالي الربح النهائي
              مش هيظهر كامل. الربح المعروض أدناه محسوب للتكاليف المعروفة بس.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              label="صافي مبيعات المنتجات"
              value={formatPrice(summary.netSales)}
              detail={`قبل الخصم ${formatPrice(summary.grossSales)} — خصومات ${formatPrice(summary.discounts)}`}
              Icon={Banknote}
              accent="from-emerald-500/10 text-emerald-700"
            />
            <SummaryCard
              label="تكلفة البضاعة المعروفة"
              value={formatPrice(summary.knownCostOfGoodsSold)}
              detail={`${summary.unitsSold} وحدة مباعة`}
              Icon={Package}
              accent="from-sky-500/10 text-sky-700"
            />
            <SummaryCard
              label={summary.grossProfit === null ? 'ربح معروف (جزئي)' : 'إجمالي الربح'}
              value={formatPrice(summary.grossProfit ?? summary.knownGrossProfit)}
              detail="قبل مصاريف التشغيل والشحن"
              Icon={TrendingUp}
              accent="from-violet-500/10 text-violet-700"
            />
            <SummaryCard
              label="الطلبات المسلّمة"
              value={String(summary.deliveredOrders)}
              detail="في الفترة المحددة"
              Icon={Calculator}
              accent="from-amber-500/10 text-amber-700"
            />
            <SummaryCard
              label="متوسط قيمة الطلب"
              value={formatPrice(summary.averageOrderValue)}
              detail="صافي قيمة المنتجات، من غير الشحن"
              Icon={Banknote}
              accent="from-rose-500/10 text-rose-700"
            />
            <SummaryCard
              label="تكاليف محتاجة تسجيل"
              value={String(summary.unknownCostUnits)}
              detail="وحدة مباعة تكلفتها التاريخية غير معروفة"
              Icon={Package}
              accent="from-plum/10 text-plum"
            />
          </div>

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-plum">ملخص كل منتج</h2>
              <p className="mt-1 text-sm text-muted">
                الربح = صافي المبيعات بعد توزيع الخصم − تكلفة الوحدات اللي تكلفتها مسجلة.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[1180px] text-right text-sm">
                <thead className="bg-accent/30 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">المنتج</th>
                    <th className="px-4 py-3 font-medium">تكلفة الوحدة الحالية</th>
                    <th className="px-4 py-3 font-medium">الوحدات المباعة</th>
                    <th className="px-4 py-3 font-medium">المبيعات قبل الخصم</th>
                    <th className="px-4 py-3 font-medium">الخصم الموزّع</th>
                    <th className="px-4 py-3 font-medium">صافي المبيعات</th>
                    <th className="px-4 py-3 font-medium">تكلفة البضاعة</th>
                    <th className="px-4 py-3 font-medium">الربح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => (
                    <AccountingProductRow key={product.productId ?? product.name} product={product} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  Icon,
  accent,
}: {
  label: string
  value: string
  detail: string
  Icon: typeof Package
  accent: string
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br to-transparent ${accent}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-charcoal">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  )
}

function AccountingProductRow({ product }: { product: AdminAccountingProduct }) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium">
        {product.name}
        {product.sku && <span className="mt-1 block text-xs text-muted">{product.sku}</span>}
      </td>
      <td className="px-4 py-3">{formatAmount(product.currentCostPrice)}</td>
      <td className="px-4 py-3">{product.unitsSold}</td>
      <td className="px-4 py-3">{formatPrice(product.grossSales)}</td>
      <td className="px-4 py-3">{formatPrice(product.discount)}</td>
      <td className="px-4 py-3">{formatPrice(product.netSales)}</td>
      <td className="px-4 py-3">
        {formatPrice(product.costOfGoodsSold)}
        {product.unknownCostUnits > 0 && (
          <span className="mt-1 block text-xs text-warning">
            {product.unknownCostUnits} وحدة تكلفتها مجهولة
          </span>
        )}
      </td>
      <td className="px-4 py-3 font-semibold text-plum">
        {formatAmount(product.grossProfit)}
      </td>
    </tr>
  )
}
