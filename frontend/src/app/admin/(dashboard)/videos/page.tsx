import type { Metadata } from 'next'
import { VideosManager } from '@/features/admin/components/videos-manager'

export const metadata: Metadata = {
  title: 'فيديوهات المتجر',
}

export default function VideosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum">فيديوهات المتجر</h1>
        <p className="mt-1 text-sm text-muted">
          ارفعي فيديوهات الصفحة الرئيسية، رتّبيها، وتحكّمي في ظهور السكشن.
        </p>
      </div>
      <VideosManager />
    </div>
  )
}
