import type { Metadata } from 'next'
import { SitePageView } from '@/features/site-pages/site-page-view'

export const metadata: Metadata = {
  title: 'من نحن',
  description:
    'شيلايت علامة مصرية فاخرة للمستحضرات الجلدية — جمال مستوحى سريرياً لإشراقتكِ.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return <SitePageView pageKey="about" />
}
