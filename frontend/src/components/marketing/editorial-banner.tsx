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
  const [banners, setBanners] = useState<Awaited<ReturnType<typeof bannerService.list>>>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  // بنر الإديتوريال المُدار من اللوحة. في الوضع البعيد لا يوجد رجوع تلقائي
  // للصورة الافتراضية حتى يختفي البانر فعلاً عند حذفه من اللوحة.
  useEffect(() => {
    if (!USE_REMOTE_API) return
    let cancelled = false
    void bannerService.list('EDITORIAL').then((banners) => {
      if (!cancelled) setBanners(banners)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!USE_REMOTE_API || paused || banners.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % banners.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [banners.length, paused])

  if (USE_REMOTE_API) {
    if (banners.length === 0) return null
    return (
      <section className="py-14 md:py-20" aria-label="بنرات العروض">
        <div className="container-shelight">
          <div
            className="relative mx-auto aspect-[4/5] max-h-[560px] w-full max-w-6xl overflow-hidden rounded-xl bg-surface shadow-card md:aspect-[16/6]"
            aria-roledescription="carousel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {banners.map((banner, index) => {
              const image = (
                <picture className="absolute inset-0 block">
                  {banner.mobileImageUrl && (
                    <source media="(max-width: 767px)" srcSet={banner.mobileImageUrl} />
                  )}
                  <Image
                    src={banner.imageUrl}
                    alt="عروض ومنتجات SHE LIGHT"
                    fill
                    sizes="(min-width: 1280px) 1152px, 100vw"
                    quality={90}
                    className="object-cover"
                  />
                </picture>
              )
              const slide = banner.linkUrl ? (
                <Link href={banner.linkUrl} className="absolute inset-0 block">
                  {image}
                </Link>
              ) : (
                image
              )

              return (
                <div
                  key={banner.id}
                  aria-hidden={index !== activeIndex}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                >
                  {slide}
                </div>
              )
            })}
            {banners.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    aria-label={`عرض البنر ${index + 1}`}
                    aria-current={index === activeIndex}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full shadow-sm transition-all ${
                      index === activeIndex
                        ? 'w-7 bg-white'
                        : 'w-2.5 bg-white/60 hover:bg-white/90'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  const image = DEFAULT_IMAGE
  const href = DEFAULT_HREF

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
