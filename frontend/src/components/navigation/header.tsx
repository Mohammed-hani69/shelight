'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search, Heart, User, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { useUIStore } from '@/store/ui-store'
import { useWishlistStore } from '@/store/wishlist-store'
import { useAuthStore } from '@/store/auth-store'
import { AnnouncementBar } from '@/components/navigation/announcement-bar'
import { DesktopNavigation } from '@/components/navigation/desktop-navigation'
import { LanguageToggle } from '@/components/navigation/language-toggle'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/use-i18n'

/**
 * الهيدر.
 *
 * - الموبايل (< lg): اللوجو في منتصف الشريط فقط، بلا أي أيقونة.
 *   البحث وتبديل اللغة وانتقال الأقسام انتقلت للفوتر والشريط السفلي.
 * - الديسكتوب (lg+): اللوجو + التنقل الكامل + الأدوات.
 */
export function Header() {
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const wishlistCount = useWishlistStore((s) => s.ids.length)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const openCart = useCartStore((s) => s.open)
  const { t } = useI18n()

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 border-b border-border bg-cream/90 backdrop-blur">
        {/* موبايل: لوجو في المنتصف فقط */}
        <div className="container-shelight flex h-14 items-center justify-center lg:hidden">
          <Link
            href="/"
            className="flex h-14 items-center justify-center"
            aria-label={t.header.home}
          >
            <Image src="/images/logo.png" alt="SHE LIGHT" width={640} height={424} priority className="h-12 w-auto object-contain" />
          </Link>
        </div>

        {/* ديسكتوب: اللوجو يساراً والتنقل والأدوات */}
        <div className="container-shelight hidden h-16 items-center justify-between gap-3 lg:flex">
          <Link href="/" className="flex items-center" aria-label={t.header.home}>
            <Image src="/images/logo.png" alt="SHE LIGHT" width={640} height={424} priority className="h-14 w-auto object-contain" />
          </Link>

          <DesktopNavigation />

          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t.header.searchProducts}
              onClick={() => setSearchOpen(true)}
            >
              <Search />
            </Button>
            <LanguageToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.nav.account}
              asChild
            >
              <Link href={isAuthenticated ? '/account' : '/login'}>
                <User />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${t.nav.wishlist} (${wishlistCount})`}
              asChild
            >
              <Link href="/wishlist" className="relative">
                <Heart />
                {wishlistCount > 0 && (
                  <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${t.nav.bag} (${cartCount})`}
              onClick={openCart}
              className="relative"
            >
              <ShoppingBag />
              {cartCount > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>
    </>
  )
}
