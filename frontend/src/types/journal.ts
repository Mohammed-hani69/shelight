/** مقال المدونة كما تأتي من `GET /journal` — يحتوي حقول العرض المُترجَمة. */
export interface JournalPost {
  id?: string
  slug: string
  title: string
  excerpt: string
  content: string[]
  category: string
  author: string
  readTime: string
  publishDate: string
  image: string
  /** المقال المميز يظهر في بطاقة كبيرة أعلى صفحة المدونة. */
  isFeatured?: boolean
}
