'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Check, Gift, LoaderCircle, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MediaImage } from '@/components/common/media-image'
import { marketingSectionsService, type StorefrontSectionContent } from '@/features/marketing-sections/marketing-sections-service'
import { referralsApi } from '@/features/referrals/referrals-api'
import { friendlyMessage } from '@/lib/api/errors'
import { readReferralCode, saveReferralCode } from '@/features/referrals/referral-utils'

const DEFAULT_CAMPAIGN: StorefrontSectionContent = {
  key: 'referral_campaign',
  type: 'referral_campaign',
  isActive: true,
  title: 'ادعي صحبتك تشتري من شي لايت',
  description: 'اعملي رابط دعوة خاص بيكي وشاركِيه مع صحابك. بعد ما صحبتك تعمل طلب، هيتولدلك كوبون خصم {rewardPercent}% على طلبك الجاي.',
  buttonText: 'اعملي رابط الدعوة',
  rewardPercent: 10,
  productIds: [],
}

export function ReferralCampaignPage() {
  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN)
  const [inviterName, setInviterName] = useState('')
  const [inviterPhone, setInviterPhone] = useState('')
  const [referralUrl, setReferralUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [hasReferral, setHasReferral] = useState(false)

  useEffect(() => {
    let cancelled = false
    setHasReferral(Boolean(readReferralCode()))
    marketingSectionsService.getReferralCampaign()
      .then((data) => {
        if (!cancelled && data) {
          setCampaign({
            ...DEFAULT_CAMPAIGN,
            ...data,
            title: data.title || DEFAULT_CAMPAIGN.title,
            description: data.description || DEFAULT_CAMPAIGN.description,
            buttonText: data.buttonText || DEFAULT_CAMPAIGN.buttonText,
            rewardPercent: data.rewardPercent ?? DEFAULT_CAMPAIGN.rewardPercent,
          })
        }
      })
      .catch((error) => {
        console.error('تعذّر تحميل تفاصيل عرض الإحالة', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const createLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreating(true)
    try {
      const link = await referralsApi.create(inviterName.trim(), inviterPhone.trim())
      const url = `${window.location.origin}/r/${encodeURIComponent(link.code)}`
      setReferralUrl(url)
      setInviterName(link.inviterName)
      setInviterPhone(link.inviterPhone)
      toast.success('رابط دعوتك بقى جاهز!')
    } catch (error) {
      toast.error(friendlyMessage(error, 'egyptian'))
    } finally {
      setCreating(false)
    }
  }

  const shareLink = async () => {
    if (!referralUrl) return
    try {
      if (navigator.share) {
        await navigator.share({
          title: campaign.title,
          text: campaign.description,
          url: referralUrl,
        })
        return
      }
      await navigator.clipboard.writeText(referralUrl)
      toast.success('اتنسخ الرابط، ابعتيه لصحابك')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(referralUrl)
        toast.success('اتنسخ الرابط، ابعتيه لصحابك')
      } catch {
        toast.error('مقدرناش نشارك الرابط تلقائي. انسخيه من الخانة.')
      }
    }
  }

  const continueToShop = () => {
    const code = readReferralCode()
    if (code) saveReferralCode(code)
    window.location.assign('/shop')
  }

  return (
    <main className="container max-w-5xl py-10 sm:py-16">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        {campaign.imageUrl ? (
          <div className="relative h-56 sm:h-80">
            <MediaImage
              src={campaign.imageUrl}
              alt={campaign.title}
              fill
              priority
              sizes="(min-width: 1024px) 960px, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-44 items-center justify-center bg-plum text-cream sm:h-56">
            <Gift className="h-20 w-20" aria-hidden="true" />
          </div>
        )}
        <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">شي لايت بتحب تشاركك الخير</p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-plum sm:text-4xl">
              {campaign.title}
            </h1>
            <p className="mt-4 max-w-2xl whitespace-pre-line leading-8 text-muted">
              {campaign.description.replaceAll(
                '{rewardPercent}',
                String(campaign.rewardPercent ?? 10)
              )}
            </p>
            {hasReferral && (
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                <Check className="h-5 w-5" aria-hidden="true" />
                دعوة صحبتك وصلتلك! كمّلي تسوقك عشان طلبك يتحسب من رابطها.
              </div>
            )}
          </div>
          {hasReferral && (
            <Button type="button" onClick={continueToShop}>
              ابدأي التسوق
            </Button>
          )}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-2xl rounded-2xl border border-border bg-background p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold text-plum sm:text-2xl">
          اعملي رابط دعوة خاص بيكي
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          اكتبي اسمك ورقم موبايلك، وبعدها شاركي الرابط مع صحبتك. أي طلب يتعمل من خلاله هيوصلنا هنا.
        </p>
        <form onSubmit={createLink} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="referral-inviter-name">اسمك</Label>
            <Input
              id="referral-inviter-name"
              autoComplete="name"
              value={inviterName}
              onChange={(event) => setInviterName(event.target.value)}
              minLength={2}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referral-inviter-phone">رقم موبايلك</Label>
            <Input
              id="referral-inviter-phone"
              type="tel"
              autoComplete="tel"
              value={inviterPhone}
              onChange={(event) => setInviterPhone(event.target.value)}
              minLength={8}
              maxLength={32}
              required
            />
          </div>
          {!referralUrl ? (
            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? <LoaderCircle className="animate-spin" /> : <Gift />}
              {creating ? 'بنجهز رابطك...' : campaign.buttonText || 'توليد رابط الدعوة'}
            </Button>
          ) : (
            <div className="space-y-3">
              <Input
                readOnly
                value={referralUrl}
                aria-label="رابط الدعوة الخاص بيكي"
                dir="ltr"
              />
              <Button type="button" className="w-full" onClick={() => void shareLink()}>
                <Share2 aria-hidden="true" />
                مشاركة الرابط
              </Button>
            </div>
          )}
        </form>
      </section>
    </main>
  )
}
