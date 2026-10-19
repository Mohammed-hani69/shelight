import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'

export interface CustomerTrustImage {
  title: string
  url: string
}

export interface CustomerTrustSection {
  isActive: boolean
  title: string
  description: string
  images: CustomerTrustImage[]
}

export const EMPTY_CUSTOMER_TRUST_SECTION: CustomerTrustSection = {
  isActive: false,
  title: 'ثقة عملائنا فينا',
  description: '',
  images: [],
}

export const customerTrustService = {
  async getPublicSection(): Promise<CustomerTrustSection | null> {
    return apiClient.get<CustomerTrustSection | null>(endpoints.customerTrust, { auth: false })
  },

  async getAdminSection(): Promise<CustomerTrustSection> {
    return apiClient.get<CustomerTrustSection>(endpoints.admin.customerTrust)
  },

  async saveAdminSection(section: CustomerTrustSection): Promise<CustomerTrustSection> {
    return apiClient.put<CustomerTrustSection>(endpoints.admin.customerTrust, section)
  },

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const result = await apiClient.postForm<{ path: string }>(
      endpoints.admin.uploadCustomerTrustImage,
      formData
    )
    return result.path
  },
}
