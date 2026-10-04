import type { Metadata } from 'next'
import { AdminDashboard } from '@/features/admin/components/admin-dashboard'

export const metadata: Metadata = {
  title: 'نظرة عامة',
}

export default function AdminDashboardPage() {
  return <AdminDashboard />
}