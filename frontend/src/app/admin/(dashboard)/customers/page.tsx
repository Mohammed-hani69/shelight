import type { Metadata } from 'next'
import { CustomersTable } from '@/features/admin/components/customers-table'

export const metadata: Metadata = {
  title: 'العملاء',
}

export default function AdminCustomersPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">العملاء</h1>
      <CustomersTable />
    </div>
  )
}