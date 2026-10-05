'use client'

import { useState } from 'react'
import { MediaImage } from '@/components/common/media-image'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'
import type { Product } from '@/types/product'

interface ProductGalleryProps {
  images: Product['images']
}

/** معرض صور المنتج: صورة رئيسية + مصغرات */
export function ProductGallery({ images }: ProductGalleryProps) {
  const { t } = useI18n()
  const [active, setActive] = useState(0)
  const current = images[active]

  if (!current) return null

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {/* المصغرات */}
      <div className="flex gap-2.5 overflow-x-auto sm:flex-col">
        {images.map((image, i) => (
          <button
            key={image.id}
            type="button"
            aria-label={t.a11y.viewImage.replace('{index}', String(i + 1)).replace('{total}', String(images.length))}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
              i === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
            )}
          >
            <MediaImage src={image.url} alt={image.alt} fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>

      {/* الصورة الرئيسية */}
      <div className="relative aspect-square flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-accent/20">
        <MediaImage
          key={current.id}
          src={current.url}
          alt={current.alt}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  )
}