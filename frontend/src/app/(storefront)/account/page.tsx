'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, LogOut, MapPin, Phone, Star, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { useWishlistStore } from '@/store/wishlist-store'
import { useI18n } from '@/lib/i18n/use-i18n'
import { OrderList } from '@/features/account/components/order-list'

/** نظرة عامة على الحساب */
export default function AccountHomePage() {
  const router = useRouter()
  const customer = useAuthStore((s) => s.customer)
  const logout = useAuthStore((s) => s.logout)
  const { t } = useI18n()

  const handleSignOut = () => {
    logout()
    useCartStore.getState().clear()
    useWishlistStore.getState().clear()
    router.push('/')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
        <h2 className="font-display text-2xl font-semibold text-plum">
          {customer?.firstName
            ? t.account.welcomeName.replace('{name}', customer.firstName)
            : t.account.welcomeBack}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {t.account.manage}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2" aria-label={t.account.profileDetails}>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 sm:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-plum">
                <UserRound className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                {t.account.profileDetails}
              </h3>
              <p className="mt-3 break-words text-sm font-medium">{[customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || '—'}</p>
              <p className="mt-2 flex items-start gap-2 break-words text-sm text-muted">
                <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span dir="ltr">{customer?.phone || '—'}</span>
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{[customer?.address, customer?.city, customer?.governorate].filter(Boolean).join('، ') || '—'}</span>
              </p>
            </div>
            <Link href="/account/profile" className="shrink-0 text-sm font-medium text-primary hover:underline">
              {t.account.editProfile}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <Star className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted">{t.account.loyaltyPoints}</p>
            <p className="mt-1 text-xl font-semibold text-plum">{customer?.loyaltyPoints ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="account-orders-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="account-orders-title" className="font-display text-xl font-semibold text-plum">{t.account.yourOrders}</h3>
          <Link href="/account/orders" className="text-sm font-medium text-primary hover:underline">{t.account.viewOrders}</Link>
        </div>
        <OrderList />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="group rounded-[var(--radius-lg)] border border-border bg-surface p-6 transition-shadow hover:shadow-card"
        >
          <h3 className="font-display text-xl font-semibold text-plum">{t.account.yourOrders}</h3>
          <p className="mt-1 text-sm text-muted">{t.account.track}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
            {t.account.viewOrders}
            <ArrowRight className="h-4 w-4 -scale-x-100 rtl:scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </span>
        </Link>
        <Link
          href="/account/profile"
          className="group rounded-[var(--radius-lg)] border border-border bg-surface p-6 transition-shadow hover:shadow-card"
        >
          <h3 className="font-display text-xl font-semibold text-plum">{t.account.profile}</h3>
          <p className="mt-1 text-sm text-muted">{t.account.profileSub}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
            {t.account.editProfile}
            <ArrowRight className="h-4 w-4 -scale-x-100 rtl:scale-x-100 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </span>
        </Link>
      </div>

      <Separator />

      <Button variant="ghost" className="text-muted" onClick={handleSignOut}>
        <LogOut aria-hidden="true" />
        {t.account.signOut}
      </Button>
    </div>
  )
}