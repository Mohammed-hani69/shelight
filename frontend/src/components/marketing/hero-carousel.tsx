'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { heroSlides, type HeroSlide } from '@/mock-data/hero'
import { bannerService } from '@/features/banners/services/banner-service'
import { USE_REMOTE_API } from '@/features/products/services/product-service'
import { useI18n } from '@/lib/i18n/use-i18n'
import { cn } from '@/lib/utils/cn'

/** مدة عرض كل شريحة قبل الانتقال للتي تليها */
const AUTOPLAY_DELAY = 5000
/** مدة التلاشي بين الشرائح */
const TRANSITION_MS = 700
/** الحد الأدنى لحركة الإصبع لاعتبارها سحباً */
const SWIPE_THRESHOLD = 40

/**
 * كروسيل الـ Hero الرئيسي — صورة بعرض كامل مع تلاشٍ متبادل.
 *
 * مُنفَّذ بدون مكتبة خارجية: كان Swiper يثبت على آخر شريحة على بعض متصفحات
 * الموبايل فلا يتبدّل العرض. هنا التبديل التلقائي عبر `setInterval` وتلاشٍ
 * بـ CSS، مع نقاط تحكم قابلة للضغط ودعم السحب بالإصبع.
 */
export function HeroCarousel() {
  const { t } = useI18n()
  // في الوضع البعيد قاعدة البيانات هي المصدر الوحيد؛ السلايدات الثابتة للعرض
  // المحلي فقط. هكذا يختفي البنر فعلاً عند حذفه/إخفائه من اللوحة.
  const [slides, setSlides] = useState<HeroSlide[]>(
    USE_REMOTE_API ? [] : heroSlides
  )
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const startX = useRef<number | null>(null)
  const resumeTimer = useRef<number | null>(null)

  // بنرات الهيرو المُدارة من اللوحة — تسقط على السلايدات الثابتة عند غيابها.
  useEffect(() => {
    if (!USE_REMOTE_API) return
    let cancelled = false
    void bannerService.list('HERO').then((banners) => {
      if (cancelled) return
      setSlides(
        banners.map((banner) => ({
          id: banner.id,
          image: banner.imageUrl,
          eyebrow: '',
          title: '',
          subtitle: '',
          ctaLabel: '',
          ctaHref: banner.linkUrl ?? '',
        }))
      )
      setIndex(0)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return
      setIndex(((next % count) + count) % count)
    },
    [count]
  )

  /** إيقاف التبديل التلقائي مؤقتاً بعد تفاعل المستخدم ثم استئنافه */
  const pauseThenResume = useCallback(() => {
    setPaused(true)
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => setPaused(false), AUTOPLAY_DELAY + TRANSITION_MS)
  }, [])

  // التبديل التلقائي
  useEffect(() => {
    if (paused || count <= 1) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, AUTOPLAY_DELAY)
    return () => window.clearInterval(id)
  }, [paused, count])

  // إخفاء التبويب يوقف المؤقت، وعودته تُعيده
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    }
  }, [])

  if (count === 0) return null

  return (
    <section
      aria-label={t.a11y.featuredCampaigns}
      aria-roledescription="carousel"
      className="relative mb-2 md:mb-3"
    >
      <div className="relative w-full overflow-hidden shadow-card">
        <div
          className="relative aspect-[7/4.5] w-full overflow-hidden max-h-[520px] md:aspect-[16/7.2] lg:aspect-[21/9]"
          onTouchStart={(event) => {
            startX.current = event.touches[0]?.clientX ?? null
          }}
          onTouchEnd={(event) => {
            if (startX.current === null) return
            const endX = event.changedTouches[0]?.clientX ?? startX.current
            const delta = endX - startX.current
            startX.current = null
            if (Math.abs(delta) < SWIPE_THRESHOLD) return
            pauseThenResume()
            goTo(delta < 0 ? index + 1 : index - 1)
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              aria-hidden={i !== index}
              className={cn(
                'absolute inset-0 transition-opacity ease-out',
                i === index ? 'opacity-100' : 'opacity-0'
              )}
              style={{ transitionDuration: `${TRANSITION_MS}ms` }}
            >
              {slide.ctaHref ? (
                <Link href={slide.ctaHref} className="relative block h-full w-full">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    quality={90}
                    className="object-cover"
                  />
                </Link>
              ) : (
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  quality={90}
                  className="object-cover"
                />
              )}
            </div>
          ))}

          {count > 1 && (
            <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => {
                    pauseThenResume()
                    goTo(i)
                  }}
                  aria-label={t.a11y.viewImage
                    .replace('{index}', String(i + 1))
                    .replace('{total}', String(count))}
                  aria-current={i === index}
                  className={cn(
                    'h-2 w-6 rounded-full shadow-sm transition-all',
                    i === index
                      ? 'w-7 bg-primary-foreground'
                      : 'bg-primary-foreground/55 hover:bg-primary-foreground/80'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
