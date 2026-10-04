'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { navLinks, type NavLink } from '@/config/navigation'
import { productService, USE_REMOTE_API } from '@/features/products/services/product-service'
import type { Category } from '@/types/product'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

interface DesktopNavigationProps {
  className?: string
}

/** مفاتيح الروابط الثابتة للأقسام — تُستبدل بالفئات الحية عند توفر الـ API. */
const CATEGORY_LINKS = new Set(['skinCare', 'hairCare', 'eyeCare', 'nailCare', 'kidsCare'])

interface ResolvedNavLink {
  key: string
  href: string
  label?: string
  labelKey?: NavLink['labelKey']
  children?: NavLink['children']
}

/** التنقل الرئيسي للديسكتوب مع قائمة منسدلة — الفئات من الـ API ليتمكن المدير من التحكم بها. */
export function DesktopNavigation({ className }: DesktopNavigationProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const [liveCategories, setLiveCategories] = useState<Category[] | null>(null)

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

  // كل روابط الفئات الخمسة في navLinks كانت تُوسّع لجميع الفئات الحية (5×5 تكراراً).
  // نُبث الفئات من موضع القسم الأول فقط، ونتجاوز بقية المواضع.
  const firstCategoryIndex = navLinks.findIndex((link) => CATEGORY_LINKS.has(link.labelKey))

  const links: ResolvedNavLink[] = navLinks.flatMap((link, index): ResolvedNavLink[] => {
    if (!CATEGORY_LINKS.has(link.labelKey)) {
      return [{ key: link.labelKey, href: link.href, labelKey: link.labelKey, children: link.children }]
    }
    // عند التحميل أو وضع الـ mock: نُبقي الروابط الثابتة كما هي (واحد لكل موضع).
    if (!liveCategories) {
      return [{ key: link.labelKey, href: link.href, labelKey: link.labelKey }]
    }
    if (index !== firstCategoryIndex) return []
    if (liveCategories.length === 0) return []
    return liveCategories.map((category) => ({
      key: `${link.labelKey}-${category.slug}`,
      href: `/categories/${category.slug}`,
      label: category.name,
    }))
  })

  return (
    <nav className={cn('items-center gap-0.5', className)} aria-label={t.a11y.mainNav}>
      {links.map((link) => {
        const label = link.label ?? (link.labelKey ? t.nav[link.labelKey] : link.href)
        const isActive =
          pathname === link.href || (link.children?.some((c) => c.href === pathname) ?? false)

        if (link.children?.length) {
          return (
            <DropdownMenu key={link.key}>
              <DropdownMenuTrigger
                className={cn(
                  'inline-flex h-16 items-center gap-1 px-3 text-sm font-medium transition-colors hover:text-primary',
                  isActive ? 'text-primary' : 'text-charcoal'
                )}
              >
                {label}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {link.children.map((child) => (
                  <DropdownMenuItem key={child.href} asChild>
                    <Link href={child.href} className="w-full">
                      {t.nav[child.labelKey]}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }

        return (
          <Link
            key={link.key}
            href={link.href}
            className={cn(
              'inline-flex h-16 items-center px-3 text-sm font-medium transition-colors hover:text-primary',
              isActive ? 'text-primary' : 'text-charcoal'
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}