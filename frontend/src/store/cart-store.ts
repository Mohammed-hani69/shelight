import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import { cartService } from '@/features/cart/services/cart-api'
import {
  calcCartCalculations,
  buildCartItem,
  type CartCalculations,
} from '@/features/cart/utils/cart-utils'
import { friendlyMessage } from '@/lib/api/errors'
import type { CartItem } from '@/types/cart'
import type { Product } from '@/types/product'
import { useAuthStore } from '@/store/auth-store'
import { trackingClient } from '@/features/tracking/tracking-client'

/**
 * حالة السلة العالمية (client-side).
 *
 * نعرض تغييراً متفائلاً فوراً، ثم نأخذ السلة كما أعادها الخادم ونستبدل
 * بها الحالة المحلية. الاستبدال إجباري في الوضع الحقيقي: مُعرّف عنصر
 * السلة عند الخادم (`CartItem.id`) يختلف تماماً عن المعرّف المحلي المؤقت،
 * فبدون مزامنة ستُفشل أي تعديل أو حذف لاحق بـ 404.
 *
 * عند عدم وجود حساب، تبقى السلة محلية بالكامل (الزائر لا سلة عند الخادم).
 */

interface CartState {
  items: CartItem[]
  calculations: CartCalculations
  /** كود خصم مُطبَّق على السلة — مصدره باقة أو إدخال العميل في صفحة الدفع. */
  couponCode: string | null
  isOpen: boolean
  isAdding: boolean
  open: () => void
  close: () => void
  addItem: (product: Product, quantity?: number, variantId?: string) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  setCouponCode: (code: string | null) => void
  clear: () => void
  hydrate: () => Promise<void>
}

function compute(items: CartItem[]): CartCalculations {
  return calcCartCalculations(items)
}

const EMPTY_CALCULATIONS = compute([])

/** هل الطلب يذهب للخادم فعلاً؟ الزائر لا يملك سلة عند الخادم. */
function goesRemote(): boolean {
  return process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true' && useAuthStore.getState().isAuthenticated
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      /** يستبدل الحالة المحلية بما أعاده الخادم — مصدر الحقيقة في الوضع الحقيقي. */
      const adopt = (remote: { items: CartItem[] } | undefined) => {
        if (!remote) return
        const items = remote.items ?? []
        set({ items, calculations: compute(items) })
      }

      return {
        items: [],
        calculations: EMPTY_CALCULATIONS,
        couponCode: null,
        isOpen: false,
        isAdding: false,

        open: () => set({ isOpen: true }),
        close: () => set({ isOpen: false }),

        addItem: (product, quantity = 1, variantId) => {
          const previous = get().items
          const existing = get().items.find(
            (i) => i.productId === product.id && i.variantId === variantId
          )
          if (existing) {
            const next = get().items.map((i) =>
              i.id === existing.id
                ? { ...i, quantity: Math.min(i.quantity + quantity, i.stock) }
                : i
            )
            set({ items: next, calculations: compute(next) })
          } else {
            const item = { ...buildCartItem(product, quantity), variantId }
            const next = [...get().items, item]
            set({ items: next, calculations: compute(next) })
          }

          trackingClient.track('add_to_cart', {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            quantity,
          })

          if (!goesRemote()) return
          void cartService
            .addItem({ ...buildCartItem(product, quantity), variantId })
            .then(adopt)
            .catch(async (error) => {
              // قد تفشل إضافة واحدة بينما تنجح غيرها في اللحظة نفسها (إضافة باقة
              // كاملة تُنفّذ عدة إضافات متتابعة)، لذا نُعيد الحالة الحقيقية من
              // الخادم بدل لقطة محلية قديمة قد تمحو إضافات ناجحة.
              try {
                adopt(await cartService.getCart())
              } catch {
                set({ items: previous, calculations: compute(previous) })
              }
              toast.error(friendlyMessage(error))
            })
        },

        updateQuantity: (id, quantity) => {
          const previous = get().items
          const target = previous.find((i) => i.id === id)
          const next = previous.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i
          )
          set({ items: next, calculations: compute(next) })
          trackingClient.track('update_cart_quantity', {
            productId: target?.productId,
            quantity: Math.max(1, quantity),
          })
          if (!goesRemote()) return
          void cartService.updateItem(id, quantity).then(adopt).catch(() => {
            set({ items: previous, calculations: compute(previous) })
          })
        },

        removeItem: (id) => {
          const previous = get().items
          const removed = previous.find((i) => i.id === id)
          const next = previous.filter((i) => i.id !== id)
          set({ items: next, calculations: compute(next) })
          if (removed) {
            trackingClient.track('remove_from_cart', { productId: removed.productId })
          }
          if (!goesRemote()) return
          void cartService.removeItem(id).then(adopt).catch(() => {
            set({ items: previous, calculations: compute(previous) })
          })
        },

        setCouponCode: (code) => set({ couponCode: code?.trim() ? code.trim() : null }),

        clear: () => {
          set({ items: [], calculations: EMPTY_CALCULATIONS, couponCode: null })
          if (!goesRemote()) return
          void cartService.clear().then(adopt).catch(() => {})
        },

        /**
         * يجلب السلة من الخادم — يُستدعى بعد تسجيل الدخول، لأن سلة الحساب
         * كانت مخزّنة على الخادم بينما الواجهة كانت تعرض سلة الزائر المحلية.
         */
        hydrate: async () => {
          if (!goesRemote()) return
          try {
            adopt(await cartService.getCart())
          } catch {
            // نبقي السلة المحلية عند الفشل
          }
        },
      }
    },
    {
      name: 'shelight-cart',
      partialize: (state) => ({ items: state.items, couponCode: state.couponCode }),
    }
  )
)

/** فتح السلة تلقائياً عند إضافة منتج عبر AddToCartButton المشترك */
export function addToCartAndOpen(product: Product, quantity = 1, variantId?: string) {
  useCartStore.getState().addItem(product, quantity, variantId)
  useCartStore.getState().open()
}
