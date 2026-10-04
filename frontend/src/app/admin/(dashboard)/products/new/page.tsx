import type { Metadata } from 'next'
import { ProductForm } from '@/features/admin/components/product-form'

export const metadata: Metadata = {
  title: 'إضافة منتج',
}

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">إضافة منتج جديد</h1>
      <ProductForm />
    </div>
  )
}