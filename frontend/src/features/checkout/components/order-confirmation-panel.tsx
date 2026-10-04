'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, Copy, Check, PackageSearch, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'
import { formatPrice } from '@/lib/utils/format-price'
import { useI18n } from '@/lib/i18n/use-i18n'
import type { OrderConfirmation } from '@/features/checkout/utils/order-confirmation'

interface OrderConfirmationPanelProps {
  confirmation: OrderConfirmation
}

/**
 * شاشة ما بعد الشراء: تُظهر رقم الطلب بوضوح مع نسخة سريعة،
 * لأنه الرقم الوحيد الذي يحتاجه العميل (وبياناته) لتتبّع الطلب لاحقاً.
 */
export function OrderConfirmationPanel({ confirmation }: OrderConfirmationPanelProps) {
  const { t } = useI18n()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(confirmation.number)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // المتصفح رفض الوصول للحافظة — الرقم ظاهر ويتحدّد يدوياً.
    }
  }

  const trackQuery = new URLSearchParams({
    order: confirmation.number,
    ...(confirmation.phone ? { phone: confirmation.phone } : {}),
  }).toString()

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-plum">
          {t.checkout.confirm.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{t.checkout.confirm.subtitle}</p>
      </div>

      <div className="mt-7 rounded-[var(--radius-lg)] border border-primary/30 bg-primary/5 p-5 text-center">
        <p className="eyebrow text-xs font-medium text-primary">
          {t.checkout.confirm.orderNumberLabel}
        </p>
        <p className="mt-2 font-display text-2xl font-bold tracking-wide text-plum" dir="ltr">
          {confirmation.number}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="mt-4 gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
              {t.checkout.confirm.copied}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              {t.checkout.confirm.copy}
            </>
          )}
        </Button>
        {confirmation.total > 0 && (
          <p className="mt-3 text-sm text-muted">
            {t.checkout.total}: {formatPrice(confirmation.total)}
          </p>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-3">
        <Button asChild className="gap-2">
          <Link href={`/track-order?${trackQuery}`}>
            <PackageSearch className="h-4 w-4" aria-hidden="true" />
            {t.checkout.confirm.trackCta}
          </Link>
        </Button>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline">
            <Link href="/shop">{t.checkout.confirm.keepShopping}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={isAuthenticated ? '/account/orders' : '/track-order'}>
              {isAuthenticated ? t.checkout.confirm.viewOrders : t.footer.trackOrder}
            </Link>
          </Button>
        </div>
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-accent/30 p-3 text-xs text-muted">
        <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {t.checkout.confirm.phoneKept}
      </p>
    </div>
  )
}
