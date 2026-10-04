import type { Metadata } from 'next'
import {
  HeroCarousel,
  BrandPromise,
  FeaturedCategories,
  RoutineBundles,
  BestSellers,
  EditorialBanner,
  ShopByConcern,
  WhyChoose,
  DoctorReviews,
  BeforeAfterResults,
  CustomerReviews,
  InstagramSocial,
} from '@/components/marketing'

export const metadata: Metadata = {
  title: 'Premium Dermocosmetics for Your Luminous Glow',
  description:
    'Explore SHE LIGHT: a premium Egyptian dermocosmetics brand with clinically inspired skincare, haircare, eye care, nail care and kids care.',
  openGraph: {
    title: 'SHE LIGHT — Premium Dermocosmetics',
    description: 'Clinically inspired beauty for a luminous you.',
  },
}

/**
 * الصفحة الرئيسية — تُركِّب أقسام الهوم فقط.
 *
 * أُزيلت بلوكات `CategoryShowcase` الخمسة (صورة فئة + منتجاتها لكل قسم):
 * كانت أطول جزء في الصفحة وكانت مكرّرة مع `FeaturedCategories` و`ShopByConcern`
 * الذين يقودان لنفس صفحات الفئات. روابط الفئات ما زالت في الفوتر والشريط السفلي.
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
      <ShopByConcern />
      <WhyChoose />
      <DoctorReviews />
      <BeforeAfterResults />
      <CustomerReviews />
      <InstagramSocial />
    </>
  )
}
