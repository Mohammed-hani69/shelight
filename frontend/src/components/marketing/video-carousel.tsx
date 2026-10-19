'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { A11y, Autoplay, Navigation } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/navigation'
import { toast } from 'sonner'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { videosService, type VideoSection } from '@/features/videos/videos-service'
import { resolveMediaUrl } from '@/lib/api/media'
import { useI18n } from '@/lib/i18n/use-i18n'

export function VideoCarousel() {
  const [section, setSection] = useState<VideoSection | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<VideoSection['videos'][number] | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    let active = true
    videosService
      .getPublicSection()
      .then((content) => {
        if (active) setSection(content)
      })
      .catch(() => {
        if (active) toast.error('مش قادرين نحمّل فيديوهات المتجر دلوقتي.')
      })
    return () => {
      active = false
    }
  }, [])

  if (!section?.isActive || section.videos.length === 0) return null

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
            autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            navigation={{
              nextEl: '.video-carousel-next',
              prevEl: '.video-carousel-prev',
            }}
            loop={section.videos.length > 4}
            className="!overflow-visible px-1 py-1"
            a11y={{ enabled: true }}
          >
            {section.videos.map((video, index) => (
              <SwiperSlide key={`${video.url}-${index}`} className="!h-auto">
                <figure className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                  <button
                    type="button"
                    onClick={() => setSelectedVideo(video)}
                    aria-label={`تشغيل فيديو ${video.title} بالصوت`}
                    className="block w-full cursor-pointer"
                  >
                    <video
                      src={resolveMediaUrl(video.url)}
                      aria-hidden="true"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="aspect-[9/16] w-full bg-charcoal object-cover"
                    />
                  </button>
                  <figcaption className="truncate px-3 py-2.5 text-center text-sm font-medium text-plum">
                    {video.title}
                  </figcaption>
                </figure>
              </SwiperSlide>
            ))}
          </Swiper>
          {section.videos.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t.a11y.previousProducts}
                className="video-carousel-prev absolute start-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface p-2.5 shadow-soft transition-colors hover:bg-accent/60 md:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t.a11y.nextProducts}
                className="video-carousel-next absolute end-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 rounded-full border border-border bg-surface p-2.5 shadow-soft transition-colors hover:bg-accent/60 md:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      <Dialog
        open={selectedVideo !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedVideo(null)
        }}
      >
        <DialogContent className="w-[min(92vw,56rem)] max-w-none border-0 bg-transparent p-0 shadow-none sm:rounded-xl [&>button]:right-2 [&>button]:top-2 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-black/60 [&>button]:p-2 [&>button]:text-white [&>button]:opacity-100">
          {selectedVideo && (
            <>
              <DialogTitle className="sr-only">{selectedVideo.title}</DialogTitle>
              <video
                key={selectedVideo.url}
                src={resolveMediaUrl(selectedVideo.url)}
                aria-label={selectedVideo.title}
                autoPlay
                controls
                playsInline
                className="max-h-[85vh] w-full rounded-xl bg-black object-contain"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
