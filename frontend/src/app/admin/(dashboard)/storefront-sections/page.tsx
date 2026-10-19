import type { Metadata } from 'next'
import { StorefrontSectionsManager } from '@/features/admin/components/storefront-sections-manager'

export const metadata: Metadata = {
  title: 'أقسام واجهة المتجر',
}

export default function StorefrontSectionsPage() {
  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-plum">أقسام واجهة المتجر</h1>
      <p className="mb-6 text-sm text-muted">إدارة أقسام واجهة المتجر، بما فيها نافذة العروض وقسم ثقة العملاء.</p>
      <StorefrontSectionsManager />
    </div>
  )
}
