'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  FolderTree,
  Gift,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquareText,
  Menu,
  Newspaper,
  Package,
  Settings2,
  Sparkles,
  Store,
  TicketPercent,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { useAdminStore } from '@/store/admin-store'
import { customerFullName } from '@/types/auth'

const NAV_ITEMS = [
  { label: 'نظرة عامة', href: '/admin', Icon: LayoutDashboard },
  { label: 'المنتجات', href: '/admin/products', Icon: Sparkles },
  { label: 'الأقسام والفئات', href: '/admin/categories', Icon: FolderTree },
  { label: 'البنرات', href: '/admin/banners', Icon: ImageIcon },
  { label: 'أقسام واجهة المتجر', href: '/admin/storefront-sections', Icon: Megaphone },
  { label: 'تقييمات المنتجات', href: '/admin/reviews', Icon: MessageSquareText },
  { label: 'الباقات', href: '/admin/bundles', Icon: Gift },
  { label: 'المدونة', href: '/admin/journal', Icon: Newspaper },
  { label: 'الطلبات', href: '/admin/orders', Icon: Package },
  { label: 'الكوبونات', href: '/admin/coupons', Icon: TicketPercent },
  { label: 'العملاء', href: '/admin/customers', Icon: Users },
  { label: 'الإعدادات', href: '/admin/settings/shipping/bosta', Icon: Settings2 },
  { label: 'إعدادات المتجر', href: '/admin/settings/store', Icon: Store },
  { label: 'تحليلات الرحلة', href: '/admin/analytics', Icon: BarChart3 },
]

/** هيكل لوحة التحكم: شريط جانبي + هيدر + محتوى الصفحة. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const customer = useAdminStore((s) => s.customer)
  const logout = useAdminStore((s) => s.logout)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('تم تسجيل الخروج')
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-30 bg-charcoal/40 lg:hidden print:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        id="admin-sidebar"
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex w-[min(18rem,calc(100vw-2.5rem))] flex-col border-l border-border bg-surface px-4 py-6 transition-transform duration-200 lg:w-64 lg:translate-x-0 print:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="mb-8 flex items-center justify-between gap-2 px-2">
          <div>
            <Image src="/images/logo.png" alt="SHE LIGHT" width={640} height={424} className="h-12 w-auto object-contain" />
            <p className="mt-1 text-xs text-muted">لوحة التحكم</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mr-auto lg:hidden"
            aria-label="إغلاق القائمة"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="تنقل لوحة التحكم">
          {NAV_ITEMS.map(({ label, href, Icon }) => {
            const isActive =
              href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-plum text-cream'
                    : 'text-charcoal hover:bg-accent/60'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border pt-4">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="mb-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-accent/60"
          >
            <Store className="h-4 w-4" aria-hidden="true" />
            زيارة المتجر
          </Link>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      <div className="lg:mr-64 print:mr-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6 sm:py-4 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 lg:hidden"
              aria-label="فتح قائمة لوحة التحكم"
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-sidebar"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <p className="truncate text-sm text-muted">{customerFullName(customer)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-accent/70 px-3 py-1 text-xs font-medium text-accent-foreground sm:inline">
              {customer?.email}
            </span>
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={handleLogout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>
        <main className="px-6 py-8 print:p-0">{children}</main>
      </div>
    </div>
  )
}