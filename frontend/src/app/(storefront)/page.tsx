import type { Metadata } from 'next'
import {
  HeroCarousel,
  BrandPromise,
  FeaturedCategories,
  RoutineBundles,
  BestSellers,
  EditorialBanner,
  WhyChoose,
  DoctorReviews,
  CustomerReviews,
} from '@/components/marketing'
import { config } from '@/config/site'

export const metadata: Metadata = {
  title: 'مستحضرات تجميل وعناية بالبشرة والشعر في مصر',
  description:
    'تسوقي منتجات شيلايت للعناية بالبشرة والشعر والجسم في مصر. اكتشفي الغسول والمرطبات والسيروم والزيوت الطبيعية وروتين يناسب نوع بشرتك.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'شيلايت | منتجات العناية بالبشرة والشعر في مصر',
    description: 'اكتشفي مستحضرات التجميل والعناية بالبشرة والشعر والجسم من SHE LIGHT.',
    url: config.site.url,
    images: [{ url: '/images/hero/hero-1.webp', alt: 'منتجات SHE LIGHT للعناية والجمال' }],
  },
}

/**
 * الصفحة الرئيسية — تُركِّب أقسام الهوم فقط.
 *
 * تُركّب الصفحة من أقسام المتجر الرئيسية.
 */
export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <BestSellers />
      <BrandPromise />
      <FeaturedCategories />
      <RoutineBundles />
      <EditorialBanner />
      <WhyChoose />
      <DoctorReviews />
      <CustomerReviews />
    </>
  )
}
