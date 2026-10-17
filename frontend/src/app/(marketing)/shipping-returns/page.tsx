import type { Metadata } from 'next'
import { SitePageView } from '@/features/site-pages/site-page-view'

export const metadata: Metadata = {
  title: 'الشحن والإرجاع',
  description: 'معلومات الشحن والتوصيل والاستبدال والإرجاع في SHE LIGHT.',
  alternates: { canonical: '/shipping-returns' },
}

export default function ShippingReturnsPage() {
  return <SitePageView pageKey="shipping-returns" />
}
