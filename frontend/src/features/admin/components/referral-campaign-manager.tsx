'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminImageUpload } from '@/features/admin/components/admin-image-upload'
import { marketingSectionsService, type StorefrontSectionContent } from '@/features/marketing-sections/marketing-sections-service'
import { friendlyMessage } from '@/lib/api/errors'

const SECTION_KEY = 'referral_campaign'
const DEFAULT_CAMPAIGN: StorefrontSectionContent = {
  key: SECTION_KEY,
  type: 'referral_campaign',
  isActive: false,
  title: 'ادعي صحبتك تشتري من شي لايت',
  description: 'اعملي رابط دعوة خاص بيكي وشاركِيه مع صحابك. بعد ما صحبتك تعمل طلب، هيتولدلك كوبون خصم {rewardPercent}% على طلبك الجاي.',
  buttonText: 'اعملي رابط الدعوة',
  rewardPercent: 10,
  productIds: [],
}

export function ReferralCampaignManager() {
  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    marketingSectionsService.getAdminSection(SECTION_KEY)
      .then((saved) => {
        if (!cancelled) {
          setCampaign({
            ...DEFAULT_CAMPAIGN,
            ...saved,
            title: saved.title || DEFAULT_CAMPAIGN.title,
            description: saved.description || DEFAULT_CAMPAIGN.description,
            buttonText: saved.buttonText || DEFAULT_CAMPAIGN.buttonText,
            rewardPercent: saved.rewardPercent ?? DEFAULT_CAMPAIGN.rewardPercent,
          })
        }
      })
      .catch((error) => {
        if (!cancelled) toast.error(friendlyMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    if (
      !Number.isFinite(campaign.rewardPercent) ||
      (campaign.rewardPercent ?? 10) < 1 ||
      (campaign.rewardPercent ?? 10) > 100
    ) {
      toast.error('نسبة الخصم لازم تكون من 1 لـ 100٪')
      return
    }
    setSaving(true)
    try {
      const saved = await marketingSectionsService.saveAdminSection(SECTION_KEY, {
        sectionType: 'referral_campaign',
        isActive: campaign.isActive,
        title: campaign.title,
        description: campaign.description,
        imageUrl: campaign.imageUrl ?? '',
        buttonText: campaign.buttonText ?? '',
        rewardPercent: campaign.rewardPercent ?? 10,
        productIds: [],
      })
      setCampaign({ ...DEFAULT_CAMPAIGN, ...saved })
      toast.success('اتحفظ بانر الإحالة')
    } catch (error) {
      toast.error(friendlyMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">بنحمّل إعدادات بانر الإحالة...</p>
  }

  return (
    <section className="space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/40 text-primary">
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-plum">بانر دعوة الصحاب</h2>
            <p className="mt-1 text-sm text-muted">
              البانر هيظهر في الرئيسية، والضغط عليه يفتح صفحة العرض وإنشاء رابط الدعوة.
            </p>
          </div>
        </div>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Checkbox
            checked={campaign.isActive}
            onCheckedChange={(checked) =>
              setCampaign((current) => ({ ...current, isActive: checked === true }))
            }
          />
          <span>إظهار البانر في الرئيسية</span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="referral-campaign-title">عنوان البانر والعرض</Label>
          <Input
            id="referral-campaign-title"
            maxLength={160}
            value={campaign.title}
            onChange={(event) =>
              setCampaign((current) => ({ ...current, title: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referral-campaign-button">نص الزر</Label>
          <Input
            id="referral-campaign-button"
            maxLength={80}
            value={campaign.buttonText ?? ''}
            onChange={(event) =>
              setCampaign((current) => ({ ...current, buttonText: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referral-campaign-reward">نسبة خصم مكافأة صاحبة الدعوة (%)</Label>
          <Input
            id="referral-campaign-reward"
            type="number"
            min={1}
            max={100}
            value={campaign.rewardPercent ?? 10}
            onChange={(event) =>
              setCampaign((current) => ({
                ...current,
                rewardPercent: Number(event.target.value),
              }))
            }
          />
          <p className="text-xs text-muted">الكوبون بيتولد لصاحبة الدعوة بعد ما الطلب يتسجل، وصلاحيته استخدام مرة واحدة.</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="referral-campaign-description">وصف العرض</Label>
          <textarea
            id="referral-campaign-description"
            maxLength={500}
            rows={3}
            value={campaign.description}
            onChange={(event) =>
              setCampaign((current) => ({ ...current, description: event.target.value }))
            }
            className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>
        <AdminImageUpload
          id="referral-campaign-image"
          label="صورة البانر"
          value={campaign.imageUrl ?? ''}
          onChange={(imageUrl) => setCampaign((current) => ({ ...current, imageUrl }))}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          حفظ إعدادات البانر
        </Button>
      </div>
    </section>
  )
}
