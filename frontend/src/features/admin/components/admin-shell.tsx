'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  FolderTree,
  Gift,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Package,
  Settings2,
  Sparkles,
  Store,
  TicketPercent,
  Users,
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
  { label: 'الباقات', href: '/admin/bundles', Icon: Gift },
  { label: 'المدونة', href: '/admin/journal', Icon: Newspaper },
  { label: 'الطلبات', href: '/admin/orders', Icon: Package },
  { label: 'الكوبونات', href: '/admin/coupons', Icon: TicketPercent },
  { label: 'العملاء', href: '/admin/customers', Icon: Users },
  { label: 'الإعدادات', href: '/admin/settings/shipping/bosta', Icon: Settings2 },
  { label: 'تحليلات الرحلة', href: '/admin/analytics', Icon: BarChart3 },
]

/** هيكل لوحة التحكم: شريط جانبي + هيدر + محتوى الصفحة. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const customer = useAdminStore((s) => s.customer)
  const logout = useAdminStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    toast.success('تم تسجيل الخروج')
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <aside className="fixed inset-y-0 right-0 hidden w-64 flex-col border-l border-border bg-surface px-4 py-6 lg:flex print:hidden">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-plum text-cream">
            <Store className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold leading-none text-plum">SHE LIGHT</p>
            <p className="mt-1 text-xs text-muted">لوحة التحكم</p>
          </div>
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
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-6 py-4 backdrop-blur print:hidden">
          <p className="text-sm text-muted">{customerFullName(customer)}</p>
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