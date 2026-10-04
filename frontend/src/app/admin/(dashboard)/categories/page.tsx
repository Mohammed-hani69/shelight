import type { Metadata } from 'next'
import { CategoriesManager } from '@/features/admin/components/categories-manager'

export const metadata: Metadata = {
  title: 'الأقسام والفئات',
}

export default function AdminCategoriesPage() {
  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-plum">الأقسام والفئات</h1>
      <CategoriesManager />
    </div>
  )
}