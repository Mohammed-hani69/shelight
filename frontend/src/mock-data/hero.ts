export interface HeroSlide {
  id: string
  image: string
  mobileImage?: string
  eyebrow: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
}

/**
 * سلايدات الـ Hero الحملة.
 * الصور محفوظة محلياً في public/images/hero (WebP عالي الدقة لوضوح كامل)
 */
export const heroSlides: HeroSlide[] = [
  {
    id: 'hs-1',
    image: '/images/hero/hero-1.webp',
    eyebrow: 'الإشراقة المضيئة',
    title: 'أظهري إشراقتك الطبيعية',
    subtitle: 'تركيبات مستوحاة سريرياً، مصنوعة بحب لبشرة مشرقة وصحية.',
    ctaLabel: 'تسوّقي السيروم',
    ctaHref: '/products/luminous-glow-serum',
  },
  {
    id: 'hs-2',
    image: '/images/hero/hero-2.webp',
    eyebrow: 'طقوس العناية بالبشرة',
    title: 'بشرتك، بتوازن رائع',
    subtitle: 'عناية لطيفة وفعّالة لكل نوع بشرة — من أول تنظيف حتى آخر إشراقة.',
    ctaLabel: 'تسوّقي العناية بالبشرة',
    ctaHref: '/categories/skin-care',
  },
  {
    id: 'hs-3',
    image: '/images/hero/hero-3.webp',
    eyebrow: 'شعر في ازدهار',
    title: 'حريري، لامع، لا ينكسر',
    subtitle: 'ماسكات وزيت مصلحة تعيد للشعر التالف حيويته.',
    ctaLabel: 'تسوّقي العناية بالشعر',
    ctaHref: '/categories/hair-care',
  },
  {
    id: 'hs-4',
    image: '/images/hero/hero-4.webp',
    eyebrow: 'الطقس الكامل',
    title: 'طقوس مصممة من أجلك',
    subtitle: 'وفّري مع روتينات العناية الكاملة والباقات الجاهزة للإهداء.',
    ctaLabel: 'تسوّقي الباقات',
    ctaHref: '/bundles',
  },
  {
    id: 'hs-5',
    image: '/images/hero/hero-5.webp',
    eyebrow: 'محبوب سريرياً',
    title: 'موثوق من أطباء الجلدية',
    subtitle: 'مستحضرات جلدية فاخرة بنتائج مرئية مبنية على الأدلة.',
    ctaLabel: 'قصتنا',
    ctaHref: '/about',
  },
]