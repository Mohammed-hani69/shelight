'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { A11y, Autoplay, Navigation } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/navigation'
import { toast } from 'sonner'
import { SectionHeading } from '@/components/marketing/section-heading'
import {
  customerTrustService,
  type CustomerTrustSection,
} from '@/features/customer-trust/customer-trust-service'
import { resolveMediaUrl } from '@/lib/api/media'

export function CustomerTrustCarousel() {
  const [section, setSection] = useState<CustomerTrustSection | null>(null)

  useEffect(() => {
    let active = true
    customerTrustService
      .getPublicSection()
      .then((content) => {
        if (active) setSection(content)
      })
      .catch(() => {
        if (active) toast.error('مش قادرين نحمّل صور ثقة العملاء دلوقتي.')
      })
    return () => {
      active = false
    }
  }, [])

  if (!section?.isActive || section.images.length === 0) return null

  return (
    <section className="overflow-hidden py-12 md:py-16" aria-label={section.title}>
      <div className="container-shelight">
        <SectionHeading title={section.title} subtitle={section.description} />
        <div className="relative">
          <Swiper
            modules={[A11y, Autoplay, Navigation]}
            spaceBetween={12}
            slidesPerView={2}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 16 },
              768: { slidesPerView: 3, spaceBetween: 20 },
              1024: { slidesPerView: 4, spaceBetween: 24 },
            }}
            autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
            navigation={{
              nextEl: '.customer-trust-next',
              prevEl: '.customer-trust-prev',
            }}
            loop={section.images.length > 4}
            className="!overflow-visible px-1 py-1"
            a11y={{ enabled: true }}
          >
            {section.images.map((image, index) => (
              <SwiperSlide key={`${image.url}-${index}`} className="!h-auto">
                <figure className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                  <div className="flex aspect-[4/5] items-center justify-center bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveMediaUrl(image.url)}
                      alt={image.title}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {image.title && (
                    <figcaption className="truncate px-3 py-2.5 text-center text-sm font-medium text-plum">
                      {image.title}
                    </figcaption>
                  )}
                </figure>
              </SwiperSlide>
            ))}
          </Swiper>
          {section.images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="الصورة السابقة"
                className="customer-trust-prev absolute start-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface p-2.5 shadow-soft transition-colors hover:bg-accent/60 md:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="الصورة التالية"
                className="customer-trust-next absolute end-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 rounded-full border border-border bg-surface p-2.5 shadow-soft transition-colors hover:bg-accent/60 md:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
