import type { Metadata } from 'next'
import { ProductsTable } from '@/features/admin/components/products-table'

export const metadata: Metadata = {
  title: 'المنتجات',
}

export default function AdminProductsPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">المنتجات</h1>
      <ProductsTable />
    </div>
  )
}