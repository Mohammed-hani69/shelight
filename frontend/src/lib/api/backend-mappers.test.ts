import { describe, it, expect } from 'vitest'
import {
  mapCategory,
  mapProductDetail,
  mapProductListItem,
  withLang,
  type BackendProductDetail,
  type BackendProductListItem,
} from '@/lib/api/backend-mappers'
import { toApiSort } from '@/lib/api/sort-map'

/** عنصر قائمة كما يعيده Flask فعلاً (عينة من استجابة `/products?lang=ar`). */
const LIST_ITEM: BackendProductListItem = {
  id: '1',
  slug: 'luminous-glow-serum',
  name: 'سيروم الإشراقة',
  shortDescription: 'سيروم مركّز',
  price: 890,
  compareAtPrice: 1140,
  stock: 24,
  inventoryStatus: 'in-stock',
  tags: ['serum', 'glow'],
  category: { id: '1', slug: 'skin-care', name: 'العناية بالبشرة' },
  images: [{ id: '1', url: 'https://img/1.jpg', alt: 'زجاجة سيروم الإشراقة' }],
  isBestseller: true,
  isNew: false,
  rating: 4.8,
  reviewCount: 5,
}

const DETAIL: BackendProductDetail = {
  ...LIST_ITEM,
  description: 'وصف عربي كامل',
  benefits: ['فائدة أولى'],
  ingredients: ['ماء', 'فيتامين سي'],
  howToUse: ['على الوجه الرطب'],
  suitableFor: ['البشرة الجافة'],
  faqs: [{ question: 'سؤال؟', answer: 'جواب.' }],
  variants: [
    { id: 'v-001', name: '30ml', sku: 'SL-GLOW-30', price: 890, compareAtPrice: 1140, stock: 24 },
  ],
  concerns: [{ id: '1', slug: 'glow', name: 'إشراقة' }],
  createdAt: '2026-01-01T00:00:00',
}

describe('mapProductListItem', () => {
  it('يحوّل عنصر القائمة إلى عقد الواجهة كاملة', () => {
    const product = mapProductListItem(LIST_ITEM)
    expect(product.id).toBe('1')
    expect(product.name).toBe('سيروم الإشراقة')
    expect(product.category.slug).toBe('skin-care')
    expect(product.images[0].alt).toBe('زجاجة سيروم الإشراقة')
    expect(product.rating).toBe(4.8)
    expect(product.reviewCount).toBe(5)
  })

  it('يملأ حقول التفاصيل الناقصة في القوائم بقيم آمنة', () => {
    const product = mapProductListItem(LIST_ITEM)
    expect(product.benefits).toEqual([])
    expect(product.faqs).toEqual([])
    expect(product.variants).toEqual([])
  })

  it('لا ينهار على عنصر ناقص الحقول', () => {
    const product = mapProductListItem({} as BackendProductListItem)
    expect(product.name).toBe('')
    expect(product.price).toBe(0)
    expect(product.images).toEqual([])
    expect(product.category.slug).toBe('')
  })
})

describe('mapProductDetail', () => {
  it('يحافظ على الحقول الغنية والمتغيرات', () => {
    const product = mapProductDetail(DETAIL)
    expect(product.description).toBe('وصف عربي كامل')
    expect(product.benefits).toEqual(['فائدة أولى'])
    expect(product.ingredients).toEqual(['ماء', 'فيتامين سي'])
    expect(product.howToUse).toEqual(['على الوجه الرطب'])
    expect(product.suitableFor).toEqual(['البشرة الجافة'])
    expect(product.faqs).toHaveLength(1)
    expect(product.variants[0].sku).toBe('SL-GLOW-30')
    expect(product.variants[0].compareAtPrice).toBe(1140)
    expect(product.created_at).toBe('2026-01-01T00:00:00')
  })

  it('يعيد الحقول الناقصة إلى قوائم فارغة بدل undefined', () => {
    const product = mapProductDetail({ ...DETAIL, faqs: null, variants: null })
    expect(product.faqs).toEqual([])
    expect(product.variants).toEqual([])
  })
})

describe('mapCategory', () => {
  it('يحوّل فئة ويبني children', () => {
    const category = mapCategory({
      id: '1',
      slug: 'skin-care',
      name: 'العناية بالبشرة',
      children: [{ id: '2', slug: 'serums', name: 'سيرومات' }],
    })
    expect(category.slug).toBe('skin-care')
    expect(category.products).toEqual([])
    expect(category.children?.[0].name).toBe('سيرومات')
  })

  it('يحلّ مسار صورة مرفوعة على نطاق الـ API', () => {
    const category = mapCategory({
      id: '1',
      slug: 'skin-care',
      name: 'العناية بالبشرة',
      image: '/uploads/products/category.jpg',
    })
    expect(category.image).toMatch(/^https?:\/\/.+\/uploads\/products\/category\.jpg$/)
  })
})

describe('withLang', () => {
  it('يضيف اللغة دون المساس ببقية المعاملات', () => {
    const params = new URLSearchParams({ page_size: '12', sort: 'rating' })
    expect(withLang(params, 'ar')).toBe('page_size=12&sort=rating&lang=ar')
  })

  it('لا يعدّل الكائن الأصلي', () => {
    const params = new URLSearchParams({ page: '2' })
    withLang(params, 'ar')
    expect(params.get('lang')).toBeNull()
  })
})

describe('toApiSort', () => {
  it('يترجم قيم الفرز إلى مفاتيح الـ backend', () => {
    expect(toApiSort('rating')).toBe('rating')
    expect(toApiSort('popularity')).toBe('popularity')
    expect(toApiSort('price-asc')).toBe('price-asc')
    expect(toApiSort('newest')).toBe('newest')
  })

  it('يعيد undefined لقيم غير معروفة أو فارغة', () => {
    expect(toApiSort(undefined)).toBeUndefined()
    expect(toApiSort('')).toBeUndefined()
    expect(toApiSort('bogus')).toBeUndefined()
  })
})
