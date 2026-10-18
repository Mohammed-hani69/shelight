import type { Metadata } from 'next'
import { TrackOrderForm } from '@/features/orders/components/track-order-form'

export const metadata: Metadata = {
  title: 'تابعي طلبك',
  description:
    'تابعي طلب شيلايت برقم الطلب ورقم الموبايل، من غير ما تسجّلي دخول.',
}

interface TrackOrderPageProps {
  searchParams: Promise<{ order?: string; phone?: string }>
}

/** صفحة تتبّع الطلب — تعمل للزوار بلا حساب. */
export default async function TrackOrderPage({ searchParams }: TrackOrderPageProps) {
  const params = await searchParams

  return (
    <div className="container-shelight py-10 md:py-14">
      <TrackOrderForm
        initialOrderNumber={params.order ?? ''}
        initialPhone={params.phone ?? ''}
      />
    </div>
  )
}
