/** بنر عام يُعرض في المتجر — إخراج `banner_payload` من الـ backend. */
export type BannerSection = 'HERO' | 'EDITORIAL'

export interface Banner {
  id: string
  section: BannerSection
  imageUrl: string
  mobileImageUrl?: string | null
  linkUrl?: string | null
  sortOrder: number
}
