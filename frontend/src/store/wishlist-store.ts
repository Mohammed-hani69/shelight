import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { trackingClient } from '@/features/tracking/tracking-client'
import { useAuthStore } from '@/store/auth-store'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

interface WishlistState {
  ids: string[]
  toggle: (productId: string) => void
  isWishlisted: (productId: string) => boolean
  has: (productId: string) => boolean
  clear: () => void
  syncWithBackend: () => Promise<void>
}

/**
 * حالة قائمة الرغبات — حالة client تُحفظ محلياً.
 * عند وجود حساب، تتم مزامنتها مع الـ backend.
 */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],

      toggle: (productId) => {
        const exists = get().ids.includes(productId)
        const previous = get().ids

        set({
          ids: exists
            ? previous.filter((id) => id !== productId)
            : [...previous, productId],
        })

        trackingClient.track(exists ? 'wishlist_remove' : 'wishlist_add', { productId })

        if (!USE_REMOTE_API || !useAuthStore.getState().isAuthenticated) return

        // الـ backend لا يقبل إلا معرّفات رقمية، أما معرّفات الـ mock فهي `p-001`.
        const remoteId = Number(productId)
        if (!Number.isFinite(remoteId)) return

        const request = exists
          ? apiClient.delete(`${endpoints.wishlist.removeItem(productId)}?lang=ar`)
          : apiClient.post(`${endpoints.wishlist.addItem}?lang=ar`, { productId: remoteId })

        void request.catch(() => {
          // نُرجع الحالة السابقة عند رفض الخادم — وإلا عرضنا قائمة أمنيات وهمية.
          set({ ids: previous })
        })
      },

      isWishlisted: (productId) => get().ids.includes(productId),
      has: (productId) => get().ids.includes(productId),

      clear: () => set({ ids: [] }),

      syncWithBackend: async () => {
        if (!USE_REMOTE_API || !useAuthStore.getState().isAuthenticated) return
        try {
          const res = await apiClient.get<Array<{ productId: string }>>(
            `${endpoints.wishlist.get}?lang=ar`
          )
          set({ ids: (res ?? []).map((item) => String(item.productId)) })
        } catch {
          // نبقي الحالة المحلية عند الخطأ
        }
      },
    }),
    { name: 'shelight-wishlist' }
  )
)
