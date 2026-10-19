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
import { CustomerTrustCarousel } from '@/components/marketing/customer-trust-carousel'
import { config } from '@/config/site'
import { ReferralCampaignBanner } from '@/features/referrals/components/referral-campaign-banner'
import { USE_REMOTE_API } from '@/features/products/services/product-service'
import { endpoints } from '@/lib/api/endpoints'
import { heroSlides } from '@/mock-data/hero'

async function getHomepageBannerImage(): Promise<string> {
  if (!USE_REMOTE_API) return heroSlides[0].image

  try {
    const response = await fetch(
      `${config.api.baseUrl.replace(/\/$/, '')}${endpoints.banners.list}?section=HERO`,
      { cache: 'no-store' }
    )
    if (!response.ok) {
      throw new Error(`فشل تحميل بنرات الرئيسية: ${response.status}`)
    }

    const payload = (await response.json()) as {
      data?: Array<{ imageUrl?: string }>
    }
    const imageUrl = payload.data?.[0]?.imageUrl
    if (!imageUrl) return heroSlides[0].image

    if (/^https?:\/\//i.test(imageUrl)) return imageUrl
    if (imageUrl.startsWith('/uploads/')) {
      const apiOrigin = new URL(config.api.baseUrl).origin
      return new URL(imageUrl, apiOrigin).toString()
    }
    return new URL(imageUrl, config.site.url).toString()
  } catch (error) {
    console.error('تعذّر تحميل صورة معاينة مشاركة الصفحة الرئيسية', error)
    return heroSlides[0].image
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const image = await getHomepageBannerImage()
  const title = 'شيلايت | عناية ببشرتك وشعرك في مصر'
  const description = 'اكتشفي منتجات شيلايت للعناية ببشرتك وشعرك وجسمك.'

  return {
    title: 'منتجات شيلايت للعناية ببشرتك وشعرك في مصر',
    description:
      'اتسوّقي منتجات شيلايت للعناية بالبشرة والشعر والجسم في مصر. اكتشفي الغسول والمرطبات والسيروم والزيوت، واختاري روتين يناسب بشرتك.',
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description,
      url: config.site.url,
      images: [{ url: image, alt: 'بنر شيلايت الحالي' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
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
      <CustomerTrustCarousel />
      <EditorialBanner />
      <WhyChoose />
      <DoctorReviews />
      <CustomerReviews />
    </>
  )
}
