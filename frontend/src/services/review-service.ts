import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import type { ClientReview, DoctorReview, Review } from '@/types/reviews'
import { productReviews, doctorReviews, clientReviews } from '@/mock-data/reviews'
import type { Product } from '@/types/product'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

/** `ReviewOut` في الـ backend: مفاتيح camelCase ومعرّف المنتج غير مضمّن. */
interface BackendReview {
  id: string
  authorName: string
  rating: number
  title: string | null
  body: string
  isVerified: boolean
  helpfulCount: number
  createdAt: string | null
}

function mapBackendReview(review: BackendReview, productId: string): Review {
  return {
    id: String(review.id),
    productId,
    author: review.authorName,
    rating: review.rating,
    title: review.title ?? '',
    body: review.body,
    verified: review.isVerified,
    date: review.createdAt ?? '',
    helpful: review.helpfulCount,
  }
}

export const reviewService = {
  async byProduct(productId: string, product?: Product): Promise<Review[]> {
    if (!USE_REMOTE_API) return productReviews.filter((r) => r.productId === productId)

    if (!product) return []
    try {
      const res = await apiClient.get<BackendReview[]>(endpoints.reviews.byProduct(product.slug))
      return (res ?? []).map((review) => mapBackendReview(review, productId))
    } catch {
      return []
    }
  },

  /** مراجعات الأطباء نصوص تسويقية بلا مصدر في الـ backend بعد. */
  async doctors(): Promise<DoctorReview[]> {
    return doctorReviews
  },

  /** شهادات العملاء المعروضة في الصفحة الرئيسية — لا مصدر API لها بعد. */
  async clients(): Promise<ClientReview[]> {
    return clientReviews
  },

  async submit(
    product: Product,
    review: Omit<Review, 'id' | 'date' | 'helpful'>
  ): Promise<Review> {
    if (!USE_REMOTE_API) {
      const created: Review = {
        ...review,
        id: `r-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        helpful: 0,
      }
      productReviews.unshift(created)
      return created
    }

    // `authorName` مطلوب للزائر؛ والمستخدم المسجّل يتجاهله الـ backend ويستخدم اسمه.
    const res = await apiClient.post<BackendReview>(
      endpoints.reviews.create(product.slug),
      {
        rating: review.rating,
        title: review.title,
        body: review.body,
        authorName: review.author,
      }
    )
    return mapBackendReview(res, product.id)
  },

  async markHelpful(reviewId: string): Promise<void> {
    if (!USE_REMOTE_API) return
    try {
      await apiClient.post(endpoints.reviews.helpful(reviewId), {}, { auth: false })
    } catch {
      // Ignore helpful errors
    }
  },
}