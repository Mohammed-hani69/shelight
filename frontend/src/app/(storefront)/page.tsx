import type { Metadata } from 'next'
import {
  HeroCarousel,
  RoutineBundles,
  BestSellers,
  EditorialBanner,
  WhyChoose,
  DoctorReviews,
  CustomerReviews,
} from '@/components/marketing'
import { VideoCarousel } from '@/components/marketing/video-carousel'
import { config } from '@/config/site'
import { ReferralCampaignBanner } from '@/features/referrals/components/referral-campaign-banner'

export const metadata: Metadata = {
  title: 'منتجات شيلايت للعناية ببشرتك وشعرك في مصر',
  description:
    'اتسوّقي منتجات شيلايت للعناية بالبشرة والشعر والجسم في مصر. اكتشفي الغسول والمرطبات والسيروم والزيوت، واختاري روتين يناسب بشرتك.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'شيلايت | عناية ببشرتك وشعرك في مصر',
    description: 'اكتشفي منتجات شيلايت للعناية ببشرتك وشعرك وجسمك.',
    url: config.site.url,
    images: [{ url: '/images/hero/hero-1.webp', alt: 'منتجات شيلايت للعناية والجمال' }],
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
      <RoutineBundles />
      <ReferralCampaignBanner />
      <VideoCarousel />
      <EditorialBanner />
      <WhyChoose />
      <DoctorReviews />
      <CustomerReviews />
    </>
  )
}
