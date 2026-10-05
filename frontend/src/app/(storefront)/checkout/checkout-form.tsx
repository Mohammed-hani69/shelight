'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Banknote, CreditCard, Lock, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/common/empty-state'
import { checkoutSchema, type CheckoutFormValues } from '@/features/checkout/schemas/checkout'
import { OrderConfirmationPanel } from '@/features/checkout/components/order-confirmation-panel'
import {
  clearOrderConfirmation,
  readOrderConfirmation,
  saveOrderConfirmation,
  type OrderConfirmation,
} from '@/features/checkout/utils/order-confirmation'
import { useCartStore } from '@/store/cart-store'
import { useAuthStore } from '@/store/auth-store'
import { trackingClient } from '@/features/tracking/tracking-client'
import { ordersApi } from '@/features/orders/services/orders-api'
import { couponApi } from '@/features/coupons/services/coupon-api'
import { formatPrice } from '@/lib/utils/format-price'
import { friendlyMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'
import { MediaImage } from '@/components/common/media-image'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

export const governorates = [
  'cairo',
  'alexandria',
  'portSaid',
  'suez',
  'damietta',
  'dakahlia',
  'sharqia',
  'qalyubia',
  'kafrElSheikh',
  'gharbia',
  'monufia',
  'beheira',
  'ismailia',
  'giza',
  'beniSuef',
  'fayoum',
  'minya',
  'asyut',
  'sohag',
  'qena',
  'luxor',
  'aswan',
  'redSea',
  'newValley',
  'matrouh',
  'northSinai',
  'southSinai',
] as const

/** صفحة الدفع */
export function CheckoutForm() {
  const { t } = useI18n()
  const { items, calculations, clear } = useCartStore()
  const customer = useAuthStore((s) => s.customer)
  const [placing, setPlacing] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponLoading, setCouponLoading] = useState(false)
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(() =>
    readOrderConfirmation()
  )

  // شاشة التأكيد تخص آخر طلب. لحظة ما يبدأ العميل طلباً جديداً
  // (تظهر عناصر في السلة) نمسحها حتى لا تحجب النموذج.
  useEffect(() => {
    if (items.length > 0 && confirmation) {
      clearOrderConfirmation()
      setConfirmation(null)
    }
  }, [items.length, confirmation])

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      secondaryPhone: '',
      governorate: 'cairo',
      city: '',
      address: '',
      notes: '',
      paymentMethod: 'cod',
    },
  })

  // حفظ تدريجي لهوية العميل المحتمل (اسم/هاتف/عنوان) أثناء الكتابة —
  // بلا انتظار زر إتمام الشراء، وبلا أي بريد إلكتروني.
  const leadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // سلسلة حفظ متسلسلة: تمنع حفظين متزامنين لنفس الجلسة من إنشاء سجلي هوية.
  const leadChain = useRef<Promise<void>>(Promise.resolve())
  const saveLead = useCallback((values: Partial<CheckoutFormValues>) => {
    if (
      !values.fullName &&
      !values.phone &&
      !values.secondaryPhone &&
      !values.address &&
      !values.city &&
      !values.governorate
    ) {
      return
    }
    const payload = {
      checkoutKey: trackingClient.checkoutKey(),
      sessionId: trackingClient.currentSessionId ?? undefined,
      fullName: values.fullName,
      primaryPhone: values.phone,
      secondaryPhone: values.secondaryPhone,
      address: values.address,
      city: values.city,
      governorate: values.governorate,
    }
    leadChain.current = leadChain.current
      .catch(() => {})
      .then(() => trackingClient.saveCheckoutLead(payload))
  }, [])

  /* eslint-disable react-hooks/incompatible-library -- false positive with react-hook-form v7 */
  useEffect(() => {
    const subscription = watch((values) => {
      if (leadTimer.current) clearTimeout(leadTimer.current)
      leadTimer.current = setTimeout(() => saveLead(values), 900)
    })
    return () => {
      subscription.unsubscribe()
      if (leadTimer.current) clearTimeout(leadTimer.current)
    }
  }, [watch, saveLead])

  const flushLead = () => {
    if (leadTimer.current) clearTimeout(leadTimer.current)
    saveLead(getValues())
  }

  const paymentMethod = watch('paymentMethod')
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  )

  // الخصم لا يتجاوز المجموع الفرعي، مثل ما يفعل الخادم تماماً.
  const discount = couponCode ? Math.min(couponDiscount, subtotal) : 0
  const total = Math.max(0, subtotal + calculations.shipping - discount)

  // يسجّل بدء الدفع مرة واحدة عند امتلاء السلة.
  const checkoutTracked = useRef(false)
  useEffect(() => {
    if (items.length === 0 || checkoutTracked.current) return
    checkoutTracked.current = true
    trackingClient.track('begin_checkout', {
      checkoutKey: trackingClient.checkoutKey(),
      itemsCount: items.length,
      subtotal,
    })
  }, [items.length, subtotal])

  const applyCoupon = async () => {
    const code = couponInput.trim()
    if (!code || couponLoading) return
    setCouponLoading(true)
    try {
      if (USE_REMOTE_API) {
        const res = await couponApi.validate(code, subtotal)
        setCouponCode(res.code)
        setCouponDiscount(res.discountAmount)
        useCartStore.getState().setCouponCode(res.code)
        toast.success(t.checkout.coupon.appliedToast.replace('{code}', res.code))
      } else {
        // Mock mode — خصم تجريبي 10% لعرض الواجهة فقط.
        const normalized = code.toUpperCase()
        setCouponCode(normalized)
        setCouponDiscount(Math.round(subtotal * 0.1 * 100) / 100)
        useCartStore.getState().setCouponCode(normalized)
        toast.success(t.checkout.coupon.appliedToast.replace('{code}', normalized))
      }
      trackingClient.track('coupon_applied', { couponCode: code })
      setCouponInput('')
    } catch (error) {
      trackingClient.track('coupon_error', { couponCode: code })
      setCouponCode(null)
      setCouponDiscount(0)
      toast.error(friendlyMessage(error))
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    trackingClient.track('coupon_removed', { couponCode })
    setCouponCode(null)
    setCouponDiscount(0)
    useCartStore.getState().setCouponCode(null)
  }

  // عند إضافة باقة يُثبَّت كودها في السلة، فنتحقق منه تلقائياً عند فتح الدفع
  // بدل أن يكتشف العميل أن سعر الباقة لم يُطبَّق.
  const autoApplied = useRef(false)
  useEffect(() => {
    if (autoApplied.current || items.length === 0) return
    const code = useCartStore.getState().couponCode
    if (!code) return
    autoApplied.current = true
    setCouponLoading(true)
    const request = USE_REMOTE_API
      ? couponApi.validate(code, subtotal)
      : Promise.resolve({
          valid: true,
          code,
          discountType: 'fixed' as const,
          discountAmount: Math.round(subtotal * 0.1 * 100) / 100,
        })
    request
      .then((res) => {
        setCouponCode(res.code)
        setCouponDiscount(res.discountAmount)
      })
      .catch((error) => {
        // لم يعد صالحاً (مثلاً أُفرغت السلة) — نُسقطه بدل تركه معلّقاً.
        useCartStore.getState().setCouponCode(null)
        toast.error(friendlyMessage(error))
      })
      .finally(() => setCouponLoading(false))
  }, [items.length, subtotal])

  // بعد إتمام الطلب تُفرَّغ السلة، فنعرض شاشة التأكيد برقم الطلب.
  if (confirmation && items.length === 0) {
    return <OrderConfirmationPanel confirmation={confirmation} />
  }

  if (items.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title={t.checkout.empty}
          description={t.checkout.emptySub}
          actionLabel={t.checkout.continueShopping}
          actionHref="/shop"
        />
      </div>
    )
  }

  const onSubmit = async (values: CheckoutFormValues) => {
    setPlacing(true)
    trackingClient.track('add_shipping_info', {
      checkoutKey: trackingClient.checkoutKey(),
      governorate: values.governorate,
    })
    try {
      if (USE_REMOTE_API) {
        // النموذج يختار slug، لكن الخادم يخزّن نصاً يُعرض للعميل لاحقاً.
        const governorateKey = values.governorate as (typeof governorates)[number]
        const order = await ordersApi.checkout({
          ...values,
          governorate: t.checkout.governorates[governorateKey] ?? values.governorate,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId,
          })),
          couponCode: couponCode ?? undefined,
          email: customer?.email ?? undefined,
          sessionId: trackingClient.currentSessionId ?? undefined,
          checkoutKey: trackingClient.checkoutKey(),
        })
        const next: OrderConfirmation = {
          number: order.number,
          phone: values.phone,
          total: order.total,
          placedAt: order.placedAt,
        }
        saveOrderConfirmation(next)
        clear()
        setConfirmation(next)
        toast.success(t.checkout.successToast)
      } else {
        // Mock mode — رقم محلي للعرض فقط، فلا يوجد طلب حقيقي يمكن تتبّعه.
        await new Promise((resolve) => setTimeout(resolve, 1200))
        const next: OrderConfirmation = {
          number: `DEMO-${Date.now().toString().slice(-8)}`,
          phone: values.phone,
          total,
          placedAt: new Date().toISOString(),
        }
        saveOrderConfirmation(next)
        clear()
        setConfirmation(next)
        toast.success(t.checkout.successToast)
      }
    } catch (error) {
      trackingClient.track('checkout_error', {
        checkoutKey: trackingClient.checkoutKey(),
        message: friendlyMessage(error),
      })
      toast.error(friendlyMessage(error))
    } finally {
      setPlacing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        {/* معلومات الشحن */}
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-6" aria-labelledby="shipping-title">
          <h2 id="shipping-title" className="mb-5 font-display text-2xl font-semibold text-plum">
            {t.checkout.shippingDetails}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fullName">{t.checkout.fullName}</Label>
              <Input
                id="fullName"
                {...register('fullName', { onBlur: flushLead })}
                placeholder={t.checkout.namePlaceholder}
              />
              {errors.fullName && <p className="text-xs text-danger">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t.checkout.phone}</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone', { onBlur: flushLead })}
                placeholder={t.checkout.phonePlaceholder}
              />
              {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secondaryPhone">{t.checkout.secondaryPhone}</Label>
              <Input
                id="secondaryPhone"
                type="tel"
                {...register('secondaryPhone', { onBlur: flushLead })}
                placeholder={t.checkout.secondaryPhonePlaceholder}
              />
              {errors.secondaryPhone && (
                <p className="text-xs text-danger">{errors.secondaryPhone.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="governorate">{t.checkout.governorate}</Label>
              <select
                id="governorate"
                className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                {...register('governorate', { onBlur: flushLead })}
              >
                <option value="" disabled>اختاري المحافظة</option>
                {governorates.map((g) => (
                  <option key={g} value={g}>{t.checkout.governorates[g]}</option>
                ))}
              </select>
              {errors.governorate && <p className="text-xs text-danger">{errors.governorate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">{t.checkout.city}</Label>
              <Input
                id="city"
                {...register('city', { onBlur: flushLead })}
                placeholder={t.checkout.cityPlaceholder}
              />
              {errors.city && <p className="text-xs text-danger">{errors.city.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">{t.checkout.address}</Label>
              <Input
                id="address"
                {...register('address', { onBlur: flushLead })}
                placeholder={t.checkout.addressPlaceholder}
              />
              {errors.address && <p className="text-xs text-danger">{errors.address.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">{t.checkout.notes}</Label>
              <Input id="notes" {...register('notes')} placeholder={t.checkout.notesPlaceholder} />
            </div>
          </div>
        </section>

        {/* الدفع */}
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-6" aria-labelledby="payment-title">
          <h2 id="payment-title" className="mb-5 font-display text-2xl font-semibold text-plum">
            {t.checkout.payment}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={paymentMethod === 'cod'}
              onClick={() => {
                setValue('paymentMethod', 'cod')
                trackingClient.track('add_payment_info', { paymentMethod: 'cod' })
              }}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-start transition-colors',
                paymentMethod === 'cod'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <Banknote className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">{t.checkout.cod}</p>
                <p className="text-xs text-muted">{t.checkout.codSub}</p>
              </div>
            </button>
            <button
              type="button"
              aria-pressed={paymentMethod === 'card'}
              onClick={() => {
                setValue('paymentMethod', 'card')
                trackingClient.track('add_payment_info', { paymentMethod: 'card' })
              }}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-start transition-colors',
                paymentMethod === 'card'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">{t.checkout.card}</p>
                <p className="text-xs text-muted">{t.checkout.cardSub}</p>
              </div>
            </button>
          </div>
          {paymentMethod === 'card' && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-accent/30 p-3 text-xs text-muted">
              <Lock className="h-4 w-4 text-success" aria-hidden="true" />
              {t.checkout.cardNote}
            </p>
          )}
        </section>
      </div>

      {/* ملخص الطلب */}
      <aside className="h-fit rounded-[var(--radius-lg)] border border-border bg-surface p-6 lg:sticky lg:top-24">
        <h2 className="mb-4 font-display text-2xl font-semibold text-plum">{t.checkout.yourOrder}</h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                {item.image && (
                  <MediaImage src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-tight">{item.name}</p>
                <p className="text-xs text-muted">
                  {t.checkout.qty.replace('{qty}', String(item.quantity))}
                </p>
              </div>
              <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <Separator className="my-4" />
        <div>
          {couponCode ? (
            <div className="flex items-center justify-between rounded-xl border border-success/40 bg-success/5 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-success">
                <Tag className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">{couponCode}</span>
                <span className="text-xs text-muted">-{formatPrice(discount)}</span>
              </span>
              <button
                type="button"
                onClick={removeCoupon}
                aria-label={t.checkout.coupon.remove}
                className="text-muted transition-colors hover:text-danger"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void applyCoupon()
                  }
                }}
                placeholder={t.checkout.coupon.placeholder}
                aria-label={t.checkout.coupon.label}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void applyCoupon()}
                disabled={couponLoading || !couponInput.trim()}
              >
                {couponLoading ? t.checkout.coupon.applying : t.checkout.coupon.apply}
              </Button>
            </div>
          )}
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t.checkout.subtotal}</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t.checkout.shipping}</dt>
            <dd>{calculations.shipping === 0 ? t.checkout.free : formatPrice(calculations.shipping)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-success">
              <dt>{t.checkout.discount}</dt>
              <dd>-{formatPrice(discount)}</dd>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-3 text-base">
            <dt className="font-medium">{t.checkout.total}</dt>
            <dd className="font-display text-2xl font-semibold text-plum">
              {formatPrice(total)}
            </dd>
          </div>
        </dl>
        <Button type="submit" className="mt-5 w-full" disabled={placing}>
          {placing ? t.checkout.placingOrder : t.checkout.placeOrder}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {t.checkout.secure}
        </p>
      </aside>
    </form>
  )
}
