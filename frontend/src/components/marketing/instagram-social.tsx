'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Instagram } from 'lucide-react'
import { SectionHeading } from '@/components/marketing/section-heading'
import { useI18n } from '@/lib/i18n/use-i18n'

const images = [
  'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=400&h=400&q=70',
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&h=400&q=70',
  'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=400&h=400&q=70',
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=400&h=400&q=70',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=400&h=400&q=70',
  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&h=400&q=70',
]

/** الشبكة الاجتماعية — إثبات اجتماعي */
export function InstagramSocial() {
  const { t } = useI18n()

  return (
    <section className="py-14 md:py-20" aria-label={t.a11y.followInstagram}>
      <div className="container-shelight">
        <SectionHeading
          eyebrow={t.marketing.instaEyebrow}
          title={t.marketing.instaTitle}
          subtitle={t.marketing.instaSub}
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {images.map((src, i) => (
            <Link
              key={i}
              href="#"
              aria-label={`Instagram post ${i + 1}`}
              className="group relative aspect-square overflow-hidden rounded-lg"
            >
              <Image
                src={src}
                alt={`SHE LIGHT community post ${i + 1}`}
                fill
                sizes="(min-width: 640px) 16vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-plum/0 opacity-0 transition-opacity duration-300 group-hover:bg-plum/30 group-hover:opacity-100">
                <Instagram className="h-5 w-5 text-cream" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}