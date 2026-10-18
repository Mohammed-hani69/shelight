import type { Metadata } from 'next'
import { SitePageView } from '@/features/site-pages/site-page-view'

export const metadata: Metadata = {
  title: 'كلمينا',
  description: 'كلمينا لو عندك سؤال عن طلبك أو منتجاتنا، وفريق شيلايت هيساعدك.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return <SitePageView pageKey="contact" />
}
