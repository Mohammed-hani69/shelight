import type { Metadata } from 'next'
import { ReferralCampaignPage } from '@/features/referrals/components/referral-campaign-page'

export const metadata: Metadata = {
  title: 'ادعي صحبتك',
  description: 'اعملي رابط دعوة خاص بيكي وشاركيه مع صحابك عشان يعرفوا شي لايت.',
}

export default function ReferralInvitePage() {
  return <ReferralCampaignPage />
}
