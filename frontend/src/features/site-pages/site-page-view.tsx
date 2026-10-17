'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { SectionHeading } from '@/components/marketing/section-heading'
import {
  DEFAULT_SITE_PAGES,
  sitePagesService,
  type SitePageKey,
} from '@/features/site-pages/site-pages-service'

const CONTACT_ICONS = {
  phone: Phone,
  email: Mail,
  location: MapPin,
  clock: Clock,
} as const

export function SitePageView({ pageKey }: { pageKey: SitePageKey }) {
  const [page, setPage] = useState(DEFAULT_SITE_PAGES[pageKey])

  useEffect(() => {
    let active = true
    sitePagesService
      .getPublicPage(pageKey)
      .then((savedPage) => {
        if (active && savedPage) setPage({ ...DEFAULT_SITE_PAGES[pageKey], ...savedPage })
      })
      .catch(() => {
        if (active) toast.error('تعذّر تحميل آخر تحديث لمحتوى الصفحة.')
      })
    return () => {
      active = false
    }
  }, [pageKey])

  if (pageKey === 'about') {
    return (
      <>
        <section className="container-shelight py-14 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge variant="secondary" className="mb-4">{page.eyebrow}</Badge>
              <h1 className="font-display text-4xl font-semibold leading-tight text-plum md:text-6xl">
                {page.title}
              </h1>
              <p className="mt-5 max-w-xl whitespace-pre-line leading-relaxed text-muted">
                {page.description}
              </p>
            </div>
            {page.imageUrl && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)]">
                <Image
                  src={page.imageUrl}
                  alt={page.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
          </div>
        </section>
        <section className="bg-accent/20 py-14 md:py-20" aria-label="قيمنا">
          <div className="container-shelight">
            <SectionHeading eyebrow="ما نقف عليه" title="قيمنا" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {page.items.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
                  <h2 className="mb-2 font-display text-xl font-semibold text-plum">{item.title}</h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>
    )
  }

  if (pageKey === 'contact') {
    return (
      <div className="container-shelight py-14 md:py-20">
        <SectionHeading eyebrow={page.eyebrow} title={page.title} subtitle={page.description} />
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          {page.items.map((item, index) => {
            const Icon = CONTACT_ICONS[item.kind as keyof typeof CONTACT_ICONS] ?? Phone
            return (
              <div key={`${item.title}-${index}`} className="flex items-start gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-plum">{item.title}</h2>
                  <p className="mt-0.5 whitespace-pre-line text-sm font-medium text-charcoal">{item.body}</p>
                  {item.detail && <p className="whitespace-pre-line text-xs text-muted">{item.detail}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="container-shelight py-14 md:py-20">
      <SectionHeading eyebrow={page.eyebrow} title={page.title} subtitle={page.description} />
      {pageKey === 'faq' ? (
        <div className="mx-auto max-w-3xl divide-y divide-border rounded-lg border border-border bg-surface px-5">
          {page.items.map((item, index) => (
            <details key={`${item.title}-${index}`} className="group py-4">
              <summary className="cursor-pointer list-none font-medium text-plum marker:hidden">
                {item.title}
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{item.body}</p>
            </details>
          ))}
        </div>
      ) : (
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          {page.items.map((item, index) => (
            <section key={`${item.title}-${index}`} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
              <h2 className="mb-2 font-display text-xl font-semibold text-plum">{item.title}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{item.body}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
