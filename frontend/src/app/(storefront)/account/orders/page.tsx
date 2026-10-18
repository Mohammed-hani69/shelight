import type { Metadata } from 'next'
import { OrderList } from '@/features/account/components/order-list'

export const metadata: Metadata = {
  title: 'طلباتي',
  description: 'راجعي طلباتك من شيلايت وتابعيها خطوة بخطوة.',
}

export default function OrdersPage() {
  return <OrderList />
}