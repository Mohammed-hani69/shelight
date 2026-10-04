import type { Metadata } from 'next'
import { OrderDetail } from '@/features/admin/components/order-detail'

export const metadata: Metadata = {
  title: 'تفاصيل الطلب',
}

/** صفحة تفاصيل الطلب — البحث برقم الطلب (`SL-...`) كما يطلبه الـ backend. */
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>
}) {
  const { orderNumber } = await params
  return <OrderDetail orderNumber={orderNumber} />
}
