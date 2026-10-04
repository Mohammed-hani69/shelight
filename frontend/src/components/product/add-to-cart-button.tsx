'use client'

import { ShoppingBag, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { addToCartAndOpen } from '@/store/cart-store'
import type { Product } from '@/types/product'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

interface AddToCartButtonProps {
  product: Product
  quantity?: number
  variantId?: string
  className?: string
  /** تسمية الزر عند إضافة مباشرة من صفحة المنتج */
  label?: string
}

/** زر إضافة للسلة — يعرض تحميل لحظي ثم يفتح الـ Cart Drawer */
export function AddToCartButton({
  product,
  quantity = 1,
  variantId,
  className,
  label,
}: AddToCartButtonProps) {
  const [pending, setPending] = useState(false)
  const { t } = useI18n()
  const buttonText = label ?? t.product.addToCart

  const handleAdd = () => {
    if (product.inventoryStatus === 'out-of-stock') return
    setPending(true)
    // نتأخر قليلاً لنعطي إحساس العملية الحقيقية دون حجب الـ UI
    window.setTimeout(() => {
      addToCartAndOpen(product, quantity, variantId)
      setPending(false)
      toast.success(`${product.name} added to your bag`)
    }, 250)
  }

  const isUnavailable = product.inventoryStatus === 'out-of-stock'

  return (
    <Button
      onClick={handleAdd}
      disabled={isUnavailable || pending}
      className={cn('w-full', className)}
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <ShoppingBag aria-hidden="true" />
      )}
      {isUnavailable ? t.product.outOfStock : pending ? t.product.adding : buttonText}
    </Button>
  )
}