import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { journalPosts } from '@/mock-data/journal'
import type { JournalPost } from '@/types/journal'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

/**
 * خدمة المدونة.
 *
 * في الوضع الحقيقي تأتي المقالات من `GET /journal` بالعربية (مميز أولاً)،
 * ونُرجّع `undefined` عند عدم وجود مقال بدل رمي خطأ لصفحة 404.
 */
export const journalService = {
  async list(): Promise<JournalPost[]> {
    if (!USE_REMOTE_API) return journalPosts
    return apiClient.get<JournalPost[]>(`${endpoints.journal.list}?lang=ar`)
  },

  async getBySlug(slug: string): Promise<JournalPost | undefined> {
    if (!USE_REMOTE_API) return journalPosts.find((post) => post.slug === slug)
    try {
      return await apiClient.get<JournalPost>(`${endpoints.journal.detail(slug)}?lang=ar`)
    } catch {
      return undefined
    }
  },
}
