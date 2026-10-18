import { ReferralRedirect } from '@/features/referrals/components/referral-redirect'

export default async function ReferralPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <ReferralRedirect code={code} />
}
