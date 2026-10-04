import type { Metadata } from 'next'
import { JournalManager } from '@/features/admin/components/journal-manager'

export const metadata: Metadata = {
  title: 'المدونة',
}

export default function AdminJournalPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-plum">المدونة</h1>
      <JournalManager />
    </div>
  )
}
