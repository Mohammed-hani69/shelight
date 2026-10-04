/**
 * حالة جلسة لوحة التحكم — منفصلة عن `auth-store` حتى لا يظهر المدير
 * كعميل في حساب المتجر العادي. تُكتب في الأداة الواحدة `setAuthToken`
 * لأن عميل الـ API مشترك بين كل الخدمات.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAuthToken } from '@/lib/api/client'
import { adminApi } from '@/features/admin/services/admin-api'
import type { AuthCustomer } from '@/types/auth'

interface AdminState {
  customer: AuthCustomer | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await adminApi.login(email, password)
          setAuthToken(res.accessToken)
          set({
            customer: res.customer,
            token: res.accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        setAuthToken(null)
        set({ customer: null, token: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        const { token } = get()
        if (!token) return
        setAuthToken(token)
        try {
          const customer = await adminApi.getMe()
          const isAdmin = Boolean(customer.isAdmin)
          set({ customer, isAuthenticated: isAdmin })
          if (!isAdmin) setAuthToken(null)
        } catch {
          set({ customer: null, token: null, isAuthenticated: false })
          setAuthToken(null)
        }
      },
    }),
    {
      name: 'shelight-admin',
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