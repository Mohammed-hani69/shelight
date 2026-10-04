'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, A11y } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import { ProductCard } from '@/components/product/product-card'
import type { Product } from '@/types/product'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/use-i18n'

interface ProductCarouselProps {
  products: Product[]
  className?: string
}

/** كروسيل منتجات أفقي بأسهم تنقل — يُستخدم في الهوم وقسم المنتجات ذات الصلة */
export function ProductCarousel({ products }: ProductCarouselProps) {
  const { t } = useI18n()
  return (
    <div className="relative">
      <Swiper
        modules={[Navigation, A11y]}
        spaceBetween={12}
        slidesPerView={2.4}
        breakpoints={{
          480: { slidesPerView: 3, spaceBetween: 12 },
          768: { slidesPerView: 4, spaceBetween: 14 },
          1024: { slidesPerView: 5, spaceBetween: 16 },
          1280: { slidesPerView: 6, spaceBetween: 16 },
        }}
        navigation={{
          nextEl: '.swiper-button-next-shelight',
          prevEl: '.swiper-button-prev-shelight',
        }}
        className="!overflow-visible px-1 py-1"
        a11y={{ enabled: true }}
      >
        {products.map((product) => (
          <SwiperSlide key={product.id} className="!h-auto">
            <ProductCard product={product} />
          </SwiperSlide>
        ))}
      </Swiper>
      <button
        type="button"
        aria-label={t.a11y.previousProducts}
        className="swiper-button-prev-shelight absolute start-0 top-1/2 z-10 hidden -translate-y-1/2 -translate-x-1/2 rounded-full border border-border bg-surface p-2.5 shadow-soft transition-colors hover:bg-accent/60 md:flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={t.a11y.nextProducts}
        className="swiper-button-next-shelight absolute end-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 rounded-full border border-border bg-surface p-2.5 shadow-soft transition-colors hover:bg-accent/60 md:flex"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}