import type { Metadata } from 'next'
import { ProfileForm } from '@/features/account/components/profile-form'

export const metadata: Metadata = {
  title: 'الملف الشخصي',
  description: 'إدارة بيانات حسابك في شيلايت.',
}

export default function ProfilePage() {
  return <ProfileForm />
}