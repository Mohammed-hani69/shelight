'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SectionHeading } from '@/components/marketing/section-heading'
import { productService } from '@/features/products/services/product-service'
import type { Category } from '@/types/product'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

/** الفئات المميزة مع صور وروابط */
export function FeaturedCategories() {
  const { t } = useI18n()
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    let cancelled = false
    async function initial() {
      try {
        const featured = await productService.categories({ featured: true })
        if (featured.length > 0) {
          if (!cancelled) setCategories(featured)
          return
        }
        // لا أقسام مميزة بعد — نعرض كل الأقسام النشطة حتى لا تخلو الصفحة.
        const all = await productService.categories()
        if (!cancelled) setCategories(all ?? [])
      } catch {
        if (!cancelled) setCategories([])
      }
    }
    void initial()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="py-14 md:py-20" aria-label={t.a11y.shopByCategory}>
      <div className="container-shelight">
        <SectionHeading
          eyebrow={t.marketing.explore}
          title={t.marketing.shopByCategoryTitle}
          subtitle={t.marketing.shopByCategorySub}
        />
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-5">
          {categories.map((category, i) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className={cn(
                'group relative block aspect-[3/4] overflow-hidden rounded-[var(--radius-lg)]',
                // آخر عنصر فردي على شبكة الموبايل (عمودان) يأخذ صفاً كاملاً.
                i === categories.length - 1 && categories.length % 2 === 1 && 'col-span-2 lg:col-span-1'
              )}
            >
              {category.image && (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(min-width: 1024px) 20vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-plum/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="font-display text-xl font-semibold text-cream">{category.name}</h3>
                <span className="mt-0.5 block text-xs text-cream/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {t.marketing.shopNow}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}