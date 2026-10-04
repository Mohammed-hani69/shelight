import { create } from 'zustand'

interface UIState {
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
}

/**
 * حالة واجهة عابرة: نافذة البحث.
 * لا توجد قائمة جانبية للموبايل — التنقل كله في الشريط السفلي والفوتر.
 */
export const useUIStore = create<UIState>((set) => ({
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
}))
