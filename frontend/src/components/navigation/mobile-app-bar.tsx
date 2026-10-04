'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Store, ShoppingBag, Heart, UserRound } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { useWishlistStore } from '@/store/wishlist-store'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

interface TabProps {
  href: string
  label: string
  Icon: typeof Home
  active: boolean
  badge?: number
}

/**
 * شريط التنقل السفلي الثابت للموبايل.
 *
 * يظهر في كل الصفحات بما فيها صفحة المنتج.
 * ارتفاعه `--app-bar-height` (شريط 3.5rem + منطقة الأمان)، وهو ما بيرفع
 * شريط الشراء الثابت في صفحة المنتج فوقه بنفس الإزاحة بالضبط.
 */
export function MobileAppBar() {
  const pathname = usePathname()
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const wishlistCount = useWishlistStore((s) => s.ids.length)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isCartOpen = useCartStore((s) => s.isOpen)
  const openCart = useCartStore((s) => s.open)
  const { t } = useI18n()

  const accountHref = isAuthenticated ? '/account' : '/login'

  const tabs: TabProps[] = [
    { href: '/', label: t.appBar.home, Icon: Home, active: pathname === '/' },
    { href: '/shop', label: t.appBar.shop, Icon: Store, active: pathname.startsWith('/shop') },
    {
      href: '/wishlist',
      label: t.appBar.wishlist,
      Icon: Heart,
      active: pathname.startsWith('/wishlist'),
      badge: wishlistCount,
    },
    {
      href: accountHref,
      label: t.appBar.account,
      Icon: UserRound,
      active:
        pathname.startsWith('/account') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/register'),
    },
  ]

  return (
    <nav
      aria-label={t.a11y.mobileNav}
      className="fixed inset-x-0 bottom-0 z-40 h-[var(--app-bar-height)] border-t border-border bg-surface/95 backdrop-blur lg:hidden"
    >
      <div className="grid h-14 grid-cols-5">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.active ? 'page' : undefined}
            className={cn(
              'flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
              tab.active ? 'text-primary' : 'text-muted hover:text-charcoal'
            )}
          >
            <span className="relative">
              <tab.Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              {!!tab.badge && tab.badge > 0 && (
                <span className="absolute -end-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {tab.badge}
                </span>
              )}
            </span>
            {tab.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={openCart}
          aria-pressed={isCartOpen}
          className={cn(
            'flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
            isCartOpen ? 'text-primary' : 'text-muted hover:text-charcoal'
          )}
        >
          <span className="relative">
            <ShoppingBag className="h-[22px] w-[22px]" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -end-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </span>
          {t.appBar.bag}
        </button>
      </div>
    </nav>
  )
}
