import type { Metadata } from 'next'
import { SitePageView } from '@/features/site-pages/site-page-view'

export const metadata: Metadata = {
  title: 'أسئلة بتتكرر',
  description: 'إجابات على أسئلتك عن منتجات شيلايت وطلباتك.',
  alternates: { canonical: '/faq' },
}

export default function FaqPage() {
  return <SitePageView pageKey="faq" />
}
