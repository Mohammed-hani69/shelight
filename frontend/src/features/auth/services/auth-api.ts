import { apiClient, setAuthToken } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import type { AuthTokens, AuthCustomer, LoginPayload, RegisterPayload } from '@/types/auth'

/** استجابة `/auth/me` و`/auth/login`: كائن العميل داخل `data`. */
interface AuthCustomerEnvelope {
  customer: AuthCustomer
}

export const authApi = {
  async register(data: RegisterPayload): Promise<AuthTokens> {
    const tokens = await apiClient.post<AuthTokens>(endpoints.auth.register, data, { auth: false })
    setAuthToken(tokens.accessToken)
    return tokens
  },

  async login(data: LoginPayload): Promise<AuthTokens> {
    const tokens = await apiClient.post<AuthTokens>(endpoints.auth.login, data, { auth: false })
    setAuthToken(tokens.accessToken)
    return tokens
  },

  async refresh(): Promise<string> {
    const res = await apiClient.post<{ accessToken: string }>(endpoints.auth.refresh, undefined, {
      auth: false,
    })
    setAuthToken(res.accessToken)
    return res.accessToken
  },

  async getMe(): Promise<AuthCustomer> {
    const res = await apiClient.get<AuthCustomerEnvelope>(endpoints.auth.me)
    return res.customer
  },

  async logout(): Promise<void> {
    setAuthToken(null)
  },
}
