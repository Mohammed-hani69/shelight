'use client'

import { useEffect } from 'react'
import { trackingClient } from '@/features/tracking/tracking-client'

/** مكوّن صامت يسجّل مشاهدة المنتج عند تحميل صفحته. */
export function ProductViewTracker({
  productId,
  slug,
  name,
  price,
}: {
  productId: string
  slug: string
  name: string
  price: number
}) {
  useEffect(() => {
    trackingClient.track('product_view', { productId, slug, name, price })
  }, [productId, slug, name, price])

  return null
}
