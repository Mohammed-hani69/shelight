import type { Metadata } from 'next'
import { OrdersTable } from '@/features/admin/components/orders-table'

export const metadata: Metadata = {
  title: 'الطلبات',
}

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">الطلبات</h1>
      <OrdersTable />
    </div>
  )
}