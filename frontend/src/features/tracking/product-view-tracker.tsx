'use client'

import { useEffect } from 'react'
import { trackingClient } from '@/features/tracking/tracking-client'
import { trackMetaPixel } from '@/features/tracking/meta-pixel'

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
    trackMetaPixel('ViewContent', {
      content_type: 'product',
      content_ids: [productId],
      content_name: name,
      value: price,
      currency: 'EGP',
    })
  }, [productId, slug, name, price])

  return null
}
