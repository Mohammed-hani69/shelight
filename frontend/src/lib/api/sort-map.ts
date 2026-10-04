/**
 * جسر بين sort values في الواجهة ومفاتيح الفرز في الـ backend.
 *
 * الواجهة تعرض "rating" و"popularity"، وكلاهما مبني على إحصاءات
 * المراجعات، لذا نطبّقهما في الخدمة عبر استعلام فرعي في الـ backend.
 */
const SORT_TO_API: Record<string, string> = {
  'price-asc': 'price-asc',
  'price-desc': 'price-desc',
  rating: 'rating',
  newest: 'newest',
  popularity: 'popularity',
}

export function toApiSort(sort?: string): string | undefined {
  if (!sort) return undefined
  return SORT_TO_API[sort]
}
