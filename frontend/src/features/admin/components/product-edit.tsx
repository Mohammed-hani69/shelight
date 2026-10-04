'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/features/admin/components/error-state'
import { ProductForm } from '@/features/admin/components/product-form'
import { adminApi } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import type { AdminProduct } from '@/types/admin'

/** يحمّل المنتج ثم يمرّره لنموذج التحرير — النموذج نفسه معالِج عرض منفصل. */
export function ProductEdit({ productId }: { productId: string }) {
  const [product, setProduct] = useState<AdminProduct | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi
      .getProduct(productId)
      .then((data) => {
        if (!cancelled) setProduct(data)
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  if (error) return <ErrorState message={error} />
  if (!product) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        جارٍ تحميل المنتج…
      </p>
    )
  }
  return <ProductForm product={product} />
}