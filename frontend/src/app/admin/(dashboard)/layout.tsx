import type { Metadata } from 'next'
import { AdminGuard } from '@/features/admin/components/admin-guard'
import { AdminShell } from '@/features/admin/components/admin-shell'

export const metadata: Metadata = {
  title: 'لوحة التحكم',
}

/** تخطيط لوحة التحكم — يحمي كل الصفحات من غير المديرين. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  )
}