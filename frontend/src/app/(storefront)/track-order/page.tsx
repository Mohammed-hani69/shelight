import type { Metadata } from 'next'
import { TrackOrderForm } from '@/features/orders/components/track-order-form'

export const metadata: Metadata = {
  title: 'تتبع طلبك',
  description:
    'تتبّعي حالة طلبك من شيلايت برقم الطلب ورقم الموبايل — بدون الحاجة لتسجيل الدخول.',
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
