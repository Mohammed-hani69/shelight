'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bannerService } from '@/features/banners/services/banner-service'
import { USE_REMOTE_API } from '@/features/products/services/product-service'
import { useI18n } from '@/lib/i18n/use-i18n'

const DEFAULT_IMAGE = '/images/editorial/editorial-1.webp'
const DEFAULT_HREF = '/bundles'

/** البانر الترويجي الافتتاحي (Editorial) — الصورة والرابط قابلان للإدارة. */
export function EditorialBanner() {
  const { t } = useI18n()
  const [banner, setBanner] = useState<{ image: string; href: string } | null>(null)

  // بنر الإديتوريال المُدار من اللوحة. في الوضع البعيد لا يوجد رجوع تلقائي
  // للصورة الافتراضية حتى يختفي البانر فعلاً عند حذفه من اللوحة.
  useEffect(() => {
    if (!USE_REMOTE_API) return
    let cancelled = false
    void bannerService.list('EDITORIAL').then((banners) => {
      const first = banners[0]
      if (!cancelled && first) {
        setBanner({ image: first.imageUrl, href: first.linkUrl || DEFAULT_HREF })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const image = banner?.image ?? (USE_REMOTE_API ? '' : DEFAULT_IMAGE)
  const href = banner?.href ?? DEFAULT_HREF

  if (!image) return null

  return (
    <section className="py-14 md:py-20" aria-label="Promotion">
      <div className="container-shelight">
        <div className="grid overflow-hidden rounded-[var(--radius-xl)] bg-plum sm:grid-cols-2">
          <div className="relative aspect-[4/3] sm:aspect-auto">
            <Image
              src={image}
              alt="SHE LIGHT ritual collection"
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              quality={90}
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center p-8 text-cream sm:p-12 lg:p-16">
            <span className="eyebrow mb-3 text-xs font-medium text-accent">
              {t.marketing.editorialEyebrow}
            </span>
            <h2 className="font-display text-3xl font-semibold leading-tight md:text-4xl">
              {t.marketing.editorialTitle}
            </h2>
            <p className="mt-3 max-w-md text-sm text-cream/80 md:text-base">
              {t.marketing.editorialSub}
            </p>
            <Button asChild className="mt-6 w-fit">
              <Link href={href}>
                {t.marketing.shopTheEdit}
                <ArrowRight className="-scale-x-100 rtl:scale-x-100" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
