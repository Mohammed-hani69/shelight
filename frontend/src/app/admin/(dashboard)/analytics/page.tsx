import type { Metadata } from 'next'
import { AdminAnalytics } from '@/features/admin/components/admin-analytics'

export const metadata: Metadata = {
  title: 'تحليلات الرحلة',
}

export default function AdminAnalyticsPage() {
  return <AdminAnalytics />
}
