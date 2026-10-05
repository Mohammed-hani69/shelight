import type { Metadata } from 'next'
import { ReviewsManager } from '@/features/admin/components/reviews-manager'

export const metadata: Metadata = {
  title: 'تقييمات المنتجات',
}

export default function AdminReviewsPage() {
  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-plum">تقييمات المنتجات</h1>
      <p className="mb-6 text-sm text-muted">تابعي آراء العملاء وأداء المنتجات حسب التقييمات.</p>
      <ReviewsManager />
    </div>
  )
}
