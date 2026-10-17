import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'

export interface StorefrontVideo {
  title: string
  url: string
}

export interface VideoSection {
  isActive: boolean
  title: string
  description: string
  videos: StorefrontVideo[]
}

export const EMPTY_VIDEO_SECTION: VideoSection = {
  isActive: false,
  title: 'لحظات من شيلايت',
  description: 'شاهدي منتجاتنا وتجاربها عن قرب.',
  videos: [],
}

export const videosService = {
  async getPublicSection(): Promise<VideoSection | null> {
    return apiClient.get<VideoSection | null>(endpoints.storefrontVideos, { auth: false })
  },

  async getAdminSection(): Promise<VideoSection> {
    return apiClient.get<VideoSection>(endpoints.admin.storefrontVideos)
  },

  async saveAdminSection(section: VideoSection): Promise<VideoSection> {
    return apiClient.put<VideoSection>(endpoints.admin.storefrontVideos, section)
  },

  async uploadVideo(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const result = await apiClient.postForm<{ path: string }>(
      endpoints.admin.uploadStorefrontVideo,
      formData,
    )
    return result.path
  },
}
