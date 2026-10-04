'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { profileSchema, splitFullName, type ProfileFormValues } from '@/features/account/schemas/profile'
import { customerApi } from '@/features/account/services/customer-api'
import { useAuthStore } from '@/store/auth-store'
import { friendlyMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/use-i18n'

const USE_REMOTE_API = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true'

/** نموذج تعديل الملف الشخصي (React Hook Form + Zod) */
export function ProfileForm() {
  const customer = useAuthStore((s) => s.customer)
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      city: '',
      governorate: '',
      newsletter: true,
    },
  })

  /* eslint-disable react-hooks/incompatible-library -- false positive with react-hook-form v7 */
  const newsletter = watch('newsletter')

  // Load profile data on mount
  useEffect(() => {
    async function loadProfile() {
      if (!USE_REMOTE_API) {
        reset({
          name: t.account.customerName,
          phone: '+20 100 000 0000',
          address: '',
          city: t.checkout.governorates.cairo,
          governorate: t.checkout.governorates.cairo,
          newsletter: true,
        })
        setLoading(false)
        return
      }
      try {
        const profile = await customerApi.getProfile()
        reset({
          name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
          phone: profile.phone ?? '',
          address: profile.address ?? '',
          city: profile.city ?? '',
          governorate: profile.governorate ?? '',
          newsletter: profile.newsletter ?? true,
        })
      } catch (error) {
        toast.error(friendlyMessage(error))
      } finally {
        setLoading(false)
      }
    }
    void loadProfile()
  }, [reset, t])

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      if (!USE_REMOTE_API) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        toast.success(t.account.updatedToast)
        return
      }
      const { firstName, lastName } = splitFullName(values.name)
      const updated = await customerApi.updateProfile({
        firstName,
        lastName,
        phone: values.phone || null,
        address: values.address,
        city: values.city || null,
        governorate: values.governorate || null,
        newsletter: values.newsletter,
      })
      // Update auth store customer if present
      if (customer) {
        useAuthStore.setState({ customer: { ...customer, ...updated } })
      }
      toast.success(t.account.updatedToast)
    } catch (error) {
      toast.error(friendlyMessage(error))
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center text-sm text-muted">
        {t.account.loadingProfile}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-lg space-y-5 rounded-[var(--radius-lg)] border border-border bg-surface p-6"
      aria-label={t.account.profileForm}
    >
      <h2 className="font-display text-2xl font-semibold text-plum">{t.account.profileDetails}</h2>

      <div className="space-y-1.5">
        <Label htmlFor="name">{t.auth.fullName}</Label>
        <Input id="name" placeholder={t.auth.fullNamePlaceholder} {...register('name')} />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t.auth.phone}</Label>
          <Input id="phone" type="tel" placeholder={t.auth.phonePlaceholder} {...register('phone')} />
          {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">{t.auth.address}</Label>
        <Input id="address" autoComplete="street-address" placeholder={t.auth.addressPlaceholder} {...register('address')} />
        {errors.address && <p className="text-xs text-danger">{errors.address.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="city">{t.account.city}</Label>
        <Input id="city" placeholder={t.checkout.governorates.cairo} {...register('city')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="governorate">{t.checkout.governorate}</Label>
        <Input id="governorate" list="profile-governorates" {...register('governorate')} />
        <datalist id="profile-governorates">
          {Object.entries(t.checkout.governorates).map(([key, label]) => (
            <option key={key} value={label} />
          ))}
        </datalist>
      </div>

      <div className="flex items-center gap-2.5">
        <Checkbox
          id="newsletter"
          checked={newsletter}
          onCheckedChange={(checked) => setValue('newsletter', checked === true)}
        />
        <Label htmlFor="newsletter" className="text-sm font-normal text-charcoal">
          {t.account.sendTips}
        </Label>
      </div>

      <Button type="submit" disabled={isSubmitting} className={cn('w-full sm:w-auto')}>
        {isSubmitting ? t.account.saving : t.account.saveChanges}
      </Button>
    </form>
  )
}