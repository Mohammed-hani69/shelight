import type { Metadata } from 'next'
import { OrderList } from '@/features/account/components/order-list'

export const metadata: Metadata = {
  title: 'طلباتي',
  description: 'راجعي وتتبعي طلباتك من شيلايت.',
}

export default function OrdersPage() {
  return <OrderList />
}