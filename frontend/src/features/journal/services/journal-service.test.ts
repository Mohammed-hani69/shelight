import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>

const PAYLOAD = [
  {
    id: '1',
    slug: 'building-your-morning-skin-routine',
    title: 'بناء روتينك الصباحي للبشرة',
    excerpt: 'دليل لطبقات المنظف والسيروم وواقي الشمس.',
    content: ['الفقرة الأولى.', 'الفقرة الثانية.'],
    category: 'العناية بالبشرة',
    author: 'فريق شيلايت',
    readTime: 'قراءة 4 دقائق',
    publishDate: '2026-07-20',
    image: 'https://images.unsplash.com/photo-1',
    isFeatured: true,
  },
]

describe('journalService في الوضع الحقيقي', () => {
  beforeEach(() => {
    vi.resetModules()
    mockedGet.mockReset()
    vi.stubEnv('NEXT_PUBLIC_USE_REMOTE_API', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('يقرأ المقالات من الـ API بدل بيانات mock', async () => {
    mockedGet.mockResolvedValue(PAYLOAD)
    const { journalService } = await import('@/features/journal/services/journal-service')

    const posts = await journalService.list()

    expect(mockedGet).toHaveBeenCalledWith('/journal?lang=ar')
    expect(posts).toHaveLength(1)
    expect(posts[0].isFeatured).toBe(true)
    expect(posts[0].content).toHaveLength(2)
  })

  it('يقرأ مقالاً واحداً بالـ slug', async () => {
    mockedGet.mockResolvedValue(PAYLOAD[0])
    const { journalService } = await import('@/features/journal/services/journal-service')

    const post = await journalService.getBySlug('building-your-morning-skin-routine')

    expect(mockedGet).toHaveBeenCalledWith(
      '/journal/building-your-morning-skin-routine?lang=ar'
    )
    expect(post?.slug).toBe('building-your-morning-skin-routine')
  })

  it('يعيد undefined لمقال غير موجود بدل رمي خطأ', async () => {
    mockedGet.mockRejectedValue(new Error('404'))
    const { journalService } = await import('@/features/journal/services/journal-service')

    const post = await journalService.getBySlug('missing')

    expect(post).toBeUndefined()
  })
})
