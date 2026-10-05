import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'

export const GOVERNORATE_OPTIONS = [
  ['cairo', 'القاهرة'], ['alexandria', 'الإسكندرية'], ['portSaid', 'بورسعيد'], ['suez', 'السويس'],
  ['damietta', 'دمياط'], ['dakahlia', 'الدقهلية'], ['sharqia', 'الشرقية'], ['qalyubia', 'القليوبية'],
  ['kafrElSheikh', 'كفر الشيخ'], ['gharbia', 'الغربية'], ['monufia', 'المنوفية'], ['beheira', 'البحيرة'],
  ['ismailia', 'الإسماعيلية'], ['giza', 'الجيزة'], ['beniSuef', 'بني سويف'], ['fayoum', 'الفيوم'],
  ['minya', 'المنيا'], ['asyut', 'أسيوط'], ['sohag', 'سوهاج'], ['qena', 'قنا'], ['luxor', 'الأقصر'],
  ['aswan', 'أسوان'], ['redSea', 'البحر الأحمر'], ['newValley', 'الوادي الجديد'], ['matrouh', 'مطروح'],
  ['northSinai', 'شمال سيناء'], ['southSinai', 'جنوب سيناء'],
] as const

export interface StoreSettings {
  defaultShippingFee: number
  governorateFees: Record<string, number>
  freeShippingThreshold: number
  announcementAr: string
  announcementEn: string
  whatsappPhone: string
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  defaultShippingFee: 60,
  governorateFees: Object.fromEntries(GOVERNORATE_OPTIONS.map(([key]) => [key, 60])),
  freeShippingThreshold: 1500,
  announcementAr: 'شحن مجاني للطلبات فوق {threshold}',
  announcementEn: 'Free shipping over {threshold}',
  whatsappPhone: '',
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  return apiClient.get<StoreSettings>(endpoints.storeSettings)
}