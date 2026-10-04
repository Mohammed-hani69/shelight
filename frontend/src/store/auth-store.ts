import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAuthToken } from '@/lib/api/client'
import { authApi } from '@/features/auth/services/auth-api'
import { trackingClient } from '@/features/tracking/tracking-client'
import type { AuthCustomer } from '@/types/auth'

interface AuthState {
  customer: AuthCustomer | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (
    firstName: string,
    phone: string,
    address: string,
    options?: { lastName?: string; newsletter?: boolean }
  ) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (identifier, password) => {
        set({ isLoading: true })
        try {
          const credentials = identifier.includes('@')
            ? { email: identifier, password }
            : { phone: identifier, password }
          const tokens = await authApi.login(credentials)
          setAuthToken(tokens.accessToken)
          const customer = await authApi.getMe()
          set({ customer, token: tokens.accessToken, isAuthenticated: true, isLoading: false })
          trackingClient.track('login')
          void trackingClient.identify()
          // سلة الحساب محفوظة على الخادم؛ نبدل بها السلة المحلية للزائر.
          const [{ useWishlistStore }, { useCartStore }] = await Promise.all([
            import('@/store/wishlist-store'),
            import('@/store/cart-store'),
          ])
          await Promise.all([
            useWishlistStore.getState().syncWithBackend(),
            useCartStore.getState().hydrate(),
          ])
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (firstName, phone, address, options) => {
        set({ isLoading: true })
        try {
          const tokens = await authApi.register({
            firstName,
            lastName: options?.lastName,
            phone,
            password: phone,
            address,
            newsletter: options?.newsletter,
          })
          setAuthToken(tokens.accessToken)
          const customer = await authApi.getMe()
          set({ customer, token: tokens.accessToken, isAuthenticated: true, isLoading: false })
          trackingClient.track('sign_up')
          void trackingClient.identify()
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        trackingClient.track('logout')
        void trackingClient.flush()
        authApi.logout()
        trackingClient.reset()
        set({ customer: null, token: null, isAuthenticated: false })
        // السلة والأمنيات تخص الحساب — نمسحها حتى لا تُعرض لزائر آخر.
        void import('@/store/wishlist-store').then(({ useWishlistStore }) =>
          useWishlistStore.getState().clear()
        )
      },

      fetchMe: async () => {
        const { token } = get()
        if (!token) return
        setAuthToken(token)
        try {
          const customer = await authApi.getMe()
          set({ customer, isAuthenticated: true })
        } catch {
          set({ customer: null, token: null, isAuthenticated: false })
          setAuthToken(null)
        }
      },
    }),
    {
      name: 'shelight-auth',
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token)
          state.fetchMe()
        }
      },
    }
  )
)
