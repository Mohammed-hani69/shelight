import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'

export interface OfferPopupProduct {
  id: string
  slug: string
  name: string
  price: number
  compareAtPrice: number | null
  images: Array<{ id: string; url: string; alt?: string | null }>
}

export interface StorefrontSectionContent {
  key: string
  type: string
  isActive: boolean
  title: string
  description: string
  imageUrl?: string
  buttonText?: string
  rewardPercent?: number
  productIds: number[]
}

export interface PublicOfferPopup extends StorefrontSectionContent {
  products: OfferPopupProduct[]
}

export interface StorefrontSectionWrite {
  sectionType: string
  isActive: boolean
  title: string
  description: string
  imageUrl?: string
  buttonText?: string
  rewardPercent?: number
  productIds: number[]
}

export const marketingSectionsService = {
  async getAdminSection(key: string): Promise<StorefrontSectionContent> {
    return apiClient.get<StorefrontSectionContent>(endpoints.admin.storefrontSection(key))
  },

  async saveAdminSection(
    key: string,
    payload: StorefrontSectionWrite,
  ): Promise<StorefrontSectionContent> {
    return apiClient.put<StorefrontSectionContent>(endpoints.admin.storefrontSection(key), payload)
  },

  async getOfferPopup(): Promise<PublicOfferPopup | null> {
    return apiClient.get<PublicOfferPopup | null>(endpoints.storefrontSections.section('offers_popup'), {
      auth: false,
    })
  },

  async getReferralCampaign(): Promise<StorefrontSectionContent | null> {
    return apiClient.get<StorefrontSectionContent | null>(
      endpoints.storefrontSections.section('referral_campaign'),
      { auth: false }
    )
  },
}
