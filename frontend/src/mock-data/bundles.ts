import type { Bundle } from '@/types/bundle'

/**
 * بيانات الباقات (Mock) — تُستخدم فقط في وضع التصميم (USE_REMOTE_API=false).
 * في الوضع الحقيقي تأتي من `GET /bundles` بنفس الشكل بعد ملء `product`.
 */
export type BundleSeed = Omit<Bundle, 'items' | 'itemCount'> & {
  items: Array<{ productId: string; quantity: number }>
}

export const bundles: BundleSeed[] = [
  {
    id: 'b-001',
    slug: 'luminous-daily-routine',
    name: 'الروتين اليومي المضيء',
    description: 'طقسك الصباحي الكامل: منظف لطيف، سيروم مضيء ومرطب غني.',
    image:
      'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&h=900&q=70',
    items: [
      { productId: 'p-002', quantity: 1 },
      { productId: 'p-001', quantity: 1 },
      { productId: 'p-003', quantity: 1 },
    ],
    price: 1499,
    compareAtPrice: 1960,
    couponCode: 'BUNDLE-LUMINOUS',
    badge: 'أفضل قيمة',
    rating: 4.9,
    reviewCount: 187,
  },
  {
    id: 'b-002',
    slug: 'bright-eye-duo',
    name: 'ثنائي العيون المشرق',
    description:
      'قلل الانتفاخ وأضيء نظرتك مع كريم العيون بالكافيين إلى جانب معزز فيتامين C اللطيف.',
    image:
      'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&h=900&q=70',
    items: [
      { productId: 'p-005', quantity: 1 },
      { productId: 'p-001', quantity: 1 },
    ],
    price: 1190,
    compareAtPrice: 1610,
    couponCode: 'BUNDLE-EYE',
    badge: 'طقم ثنائي',
    rating: 4.8,
    reviewCount: 96,
  },
  {
    id: 'b-003',
    slug: 'silky-roots-to-tips',
    name: 'حرير من الجذور حتى الأطراف',
    description: 'إصلاح ولمعان: ماسك الشعر الكيراتين مع زيت جسم مغذٍ.',
    image:
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&h=900&q=70',
    items: [
      { productId: 'p-004', quantity: 1 },
      { productId: 'p-009', quantity: 1 },
    ],
    price: 850,
    compareAtPrice: 1020,
    couponCode: 'BUNDLE-HAIR',
    badge: 'طقس العناية',
    rating: 4.7,
    reviewCount: 64,
  },
]
