import type { Metadata } from 'next'
import { SitePageView } from '@/features/site-pages/site-page-view'

export const metadata: Metadata = {
  title: 'تواصل معنا',
  description: 'تواصلي مع فريق شيلايت — نحن هنا لمساعدتك في الطلبات والمنتجات وكل ما يخص الإشراقة.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return <SitePageView pageKey="contact" />
}
