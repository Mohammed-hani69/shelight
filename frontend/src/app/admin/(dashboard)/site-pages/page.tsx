import type { Metadata } from 'next'
import { SitePagesManager } from '@/features/admin/components/site-pages-manager'

export const metadata: Metadata = {
  title: 'محتوى صفحات الموقع',
}

export default function SitePagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum">محتوى صفحات الموقع</h1>
        <p className="mt-1 text-sm text-muted">
          إدارة محتوى صفحات من نحن، الشحن والإرجاع، تواصل معنا، والأسئلة الشائعة.
        </p>
      </div>
      <SitePagesManager />
    </div>
  )
}
