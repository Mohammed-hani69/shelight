'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

/** تنقل الحساب — يمتد مع التخطيط */
export function AccountNav() {
  const pathname = usePathname()
  const { t } = useI18n()

  const items = [
    { label: t.account.overview, href: '/account', Icon: LayoutDashboard },
    { label: t.account.orders, href: '/account/orders', Icon: Package },
    { label: t.account.profile, href: '/account/profile', Icon: UserRound },
  ]

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label={t.account.accountNav}>
      {items.map(({ label, href, Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors lg:rounded-md',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-charcoal hover:bg-accent/50'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}