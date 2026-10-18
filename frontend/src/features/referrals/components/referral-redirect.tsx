'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveReferralCode } from '@/features/referrals/referral-utils'

export function ReferralRedirect({ code }: { code: string }) {
  const router = useRouter()

  useEffect(() => {
    saveReferralCode(code)
    router.replace('/invite')
  }, [code, router])

  return (
    <p className="mx-auto max-w-2xl px-6 py-24 text-center text-muted">
      بنجهزلك صفحة الدعوة...
    </p>
  )
}
