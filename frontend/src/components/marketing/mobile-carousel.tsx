'use client'

import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface MobileCarouselProps {
  children: ReactNode
  label: string
  desktopClassName: string
  dark?: boolean
}

export function MobileCarousel({
  children,
  label,
  desktopClassName,
  dark = false,
}: MobileCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const slideCount = Children.count(children)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track || slideCount < 2) return
    const slides = Array.from(track.children)
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]
        if (mostVisible) {
          setActiveIndex(slides.indexOf(mostVisible.target as HTMLElement))
        }
      },
      { root: track, threshold: [0.5, 0.75, 1] },
    )
    slides.forEach((slide) => observer.observe(slide))
    return () => observer.disconnect()
  }, [slideCount])

  const goTo = (index: number) => {
    const slide = trackRef.current?.children[index]
    slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    setActiveIndex(index)
  }

  return (
    <div>
      <div
        ref={trackRef}
        dir="rtl"
        aria-label={label}
        aria-roledescription="carousel"
        className={cn(
          'mobile-carousel-track -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:gap-5 md:overflow-visible md:px-0 md:pb-0 md:snap-none',
          desktopClassName,
        )}
      >
        {Children.map(children, (child) => (
          <div className="w-[88%] shrink-0 snap-center md:w-auto md:shrink">
            {child}
          </div>
        ))}
      </div>
      {slideCount > 1 && (
        <div className="mt-4 flex justify-center gap-2 md:hidden" aria-label="التنقل بين الشرائح">
          {Array.from({ length: slideCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`عرض الشريحة ${index + 1} من ${slideCount}`}
              aria-current={activeIndex === index}
              onClick={() => goTo(index)}
              className={cn(
                'h-2.5 rounded-full transition-all',
                activeIndex === index ? 'w-7' : 'w-2.5',
                dark
                  ? activeIndex === index ? 'bg-cream' : 'bg-cream/45'
                  : activeIndex === index ? 'bg-primary' : 'bg-primary/30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
