import type { Metadata } from 'next'
import { ProductEdit } from '@/features/admin/components/product-edit'

export const metadata: Metadata = {
  title: 'تعديل منتج',
}

/** صفحة تعديل منتج — المعرّف الرقمي كما يطلبه الـ backend (`<int:product_id>`). */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">تعديل المنتج</h1>
      <ProductEdit productId={id} />
    </div>
  )
}