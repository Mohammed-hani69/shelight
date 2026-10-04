import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import type { AuthCustomer } from '@/types/auth'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

/** `/profile` يعيد `{ data: { customer } }` والعميل يفك `data` مسبقاً. */
interface ProfileEnvelope {
  customer: AuthCustomer
}

const EMPTY_CUSTOMER: AuthCustomer = { id: '', email: '' }

/** حقول التحديث كما يقبلها `ProfileUpdateSchema`. */
export interface ProfilePayload {
  firstName?: string
  lastName?: string
  phone?: string | null
  address?: string | null
  city?: string | null
  governorate?: string | null
  birthday?: string | null
  newsletter?: boolean
}

export const customerApi = {
  async getProfile(): Promise<AuthCustomer> {
    if (!USE_REMOTE_API) return EMPTY_CUSTOMER
    const res = await apiClient.get<ProfileEnvelope>(endpoints.profile.get)
    return res.customer
  },

  async updateProfile(data: ProfilePayload): Promise<AuthCustomer> {
    if (!USE_REMOTE_API) return EMPTY_CUSTOMER
    const res = await apiClient.put<ProfileEnvelope>(endpoints.profile.update, data)
    return res.customer
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!USE_REMOTE_API) return
    await apiClient.put(endpoints.profile.changePassword, { currentPassword, newPassword })
  },
}
