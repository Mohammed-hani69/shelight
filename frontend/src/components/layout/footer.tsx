'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LanguageToggle } from '@/components/navigation/language-toggle'
import { productService, USE_REMOTE_API } from '@/features/products/services/product-service'
import type { Category } from '@/types/product'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { useI18n } from '@/lib/i18n/use-i18n'

/**
 * فوتر الموقع.
 *
 * على الموبايل هو أيضاً مكان البحث وتبديل اللغة — لأن الهيدر هناك لوجو فقط،
 *(link عبر الشريط السفلي + روابط الفوتر يغطّيان كل روابط الموقع).
 */
export function Footer() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [liveCategories, setLiveCategories] = useState<Category[] | null>(null)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { t } = useI18n()
  const year = new Date().getFullYear()

  useEffect(() => {
    if (!USE_REMOTE_API) return
    let cancelled = false
    productService
      .categories()
      .then((cats) => {
        if (!cancelled) setLiveCategories(cats ?? [])
      })
      .catch(() => {
        if (!cancelled) setLiveCategories(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSent(true)
    toast.success(t.footer.subscribed)
    setEmail('')
  }

  const footerColumns = [
    {
      title: t.footer.shop,
      links: [
        { label: t.nav.allProducts, href: '/shop' },
        { label: t.nav.newArrivals, href: '/shop?sort=newest' },
        { label: t.nav.bestSellers, href: '/shop?sort=popularity' },
        { label: t.nav.bundles, href: '/bundles' },
      ],
    },
    {
      title: t.footer.categories,
      links:
        liveCategories && liveCategories.length > 0
          ? liveCategories.map((category) => ({
              label: category.name,
              href: `/categories/${category.slug}`,
            }))
          : [
              { label: t.nav.skinCare, href: '/categories/skin-care' },
              { label: t.nav.hairCare, href: '/categories/hair-care' },
              { label: t.nav.eyeCare, href: '/categories/eye-care' },
              { label: t.nav.nailCare, href: '/categories/nail-care' },
              { label: t.nav.kidsCare, href: '/categories/kids-care' },
            ],
    },
    {
      title: t.footer.help,
      links: [
        { label: t.footer.trackOrder, href: '/track-order' },
        { label: t.nav.myAccount, href: isAuthenticated ? '/account' : '/login' },
        { label: t.footer.shippingReturns, href: '/contact' },
        { label: t.footer.faq, href: '/contact' },
      ],
    },
    {
      title: t.footer.company,
      links: [
        { label: t.footer.aboutUs, href: '/about' },
        { label: t.nav.journal, href: '/journal' },
        { label: t.footer.contact, href: '/contact' },
      ],
    },
  ]

  return (
    <footer className="border-t border-border bg-surface">
      {/* النشرة البريدية */}
      <div className="border-b border-border bg-accent/20 py-12">
        <div className="container-shelight flex flex-col items-center gap-4 text-center">
          <p className="eyebrow text-xs font-medium text-primary">
            {t.footer.join}
          </p>
          <h2 className="font-display text-3xl font-semibold text-plum">
            {t.footer.newsTitle}
          </h2>
          <p className="max-w-md text-sm text-muted">
            {t.footer.newsSub}
          </p>
          {sent ? (
            <p className="rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success">
              {t.footer.subscribed}
            </p>
          ) : (
            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-md gap-2"
              role="form"
              aria-label={t.a11y.newsletterSignup}
            >
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.footer.enterEmail}
                aria-label={t.a11y.emailAddress}
                className="bg-surface"
              />
              <Button type="submit">{t.footer.subscribe}</Button>
            </form>
          )}
        </div>
      </div>

      {/* البحث وتبديل اللغة — هنا بدل الهيدر على الموبايل */}
      <div className="border-b border-border">
        <div className="container-shelight flex flex-col gap-3 py-6 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSearchOpen(true)}
            className="h-11 flex-1 justify-start gap-2 font-normal text-muted sm:max-w-sm"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {t.footer.searchPlaceholder}
          </Button>
          <div className="flex items-center gap-1 sm:ms-auto">
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* الأعمدة */}
      <div className="container-shelight grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Link href="/" className="mb-4 inline-flex items-center" aria-label="SHE LIGHT">
            <Image src="/images/logo.png" alt="SHE LIGHT" width={640} height={424} className="h-16 w-auto object-contain" />
          </Link>
          <p className="text-sm leading-relaxed text-muted">
            {t.footer.tagline}
          </p>
        </div>

        {footerColumns.map((col) => (
          <nav key={col.title} aria-label={`${col.title} links`}>
            <h3 className="mb-4 font-display text-lg font-semibold text-plum">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border py-5">
        <div className="container-shelight flex flex-col items-center justify-between gap-2 text-xs text-muted sm:flex-row">
          <p>© {year} SHE LIGHT. {t.footer.rights}</p>
          <p>{t.footer.crafted}</p>
        </div>
      </div>
    </footer>
  )
}
