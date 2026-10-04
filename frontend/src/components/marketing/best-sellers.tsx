'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SectionHeading } from '@/components/marketing/section-heading'
import { ProductCarousel } from '@/components/product/product-carousel'
import { Button } from '@/components/ui/button'
import { productService } from '@/features/products/services/product-service'
import type { Product } from '@/types/product'
import { useI18n } from '@/lib/i18n/use-i18n'

/** الأكثر مبيعاً — كروسيل منتجات */
export function BestSellers() {
  const { t } = useI18n()
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    let active = true
    productService
      .bestsellers(10)
      .then((result) => {
        if (active) setProducts(result)
      })
      .catch(() => {
        if (active) setProducts([])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="pt-4 pb-14 md:pt-6 md:pb-20" aria-label={t.a11y.bestSellers}>
      <div className="container-shelight">
        <SectionHeading
          eyebrow={t.marketing.bestSellersEyebrow}
          title={t.marketing.bestSellersTitle}
          subtitle={t.marketing.bestSellersSub}
        />
        <ProductCarousel products={products} />
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link href="/shop?sort=popularity">{t.marketing.viewAllBestsellers}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}