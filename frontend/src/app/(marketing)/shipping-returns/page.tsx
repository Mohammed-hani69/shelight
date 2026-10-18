import type { Metadata } from 'next'
import { SitePageView } from '@/features/site-pages/site-page-view'

export const metadata: Metadata = {
  title: 'الشحن والاستبدال',
  description: 'اعرفي تفاصيل الشحن والتوصيل والاستبدال والاسترجاع من شيلايت.',
  alternates: { canonical: '/shipping-returns' },
}

export default function ShippingReturnsPage() {
  return <SitePageView pageKey="shipping-returns" />
}
