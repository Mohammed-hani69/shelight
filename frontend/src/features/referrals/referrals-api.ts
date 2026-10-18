import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'

export interface CreatedReferralLink {
  id: string
  code: string
  inviterName: string
  inviterPhone: string
  createdAt: string | null
}

export const referralsApi = {
  create(inviterName: string, inviterPhone: string): Promise<CreatedReferralLink> {
    return apiClient.post<CreatedReferralLink>(
      endpoints.orders.createReferral,
      { inviterName, inviterPhone },
      { auth: false }
    )
  },
}
