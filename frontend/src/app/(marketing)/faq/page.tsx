import type { Metadata } from 'next'
import { SitePageView } from '@/features/site-pages/site-page-view'

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة',
  description: 'إجابات عن الأسئلة الشائعة حول منتجات وطلبات SHE LIGHT.',
  alternates: { canonical: '/faq' },
}

export default function FaqPage() {
  return <SitePageView pageKey="faq" />
}
