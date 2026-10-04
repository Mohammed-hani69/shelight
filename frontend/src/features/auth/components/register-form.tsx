'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerSchema, splitFullName, type RegisterFormValues } from '@/features/auth/schemas/register'
import { useAuthStore } from '@/store/auth-store'
import { friendlyMessage } from '@/lib/api/errors'
import { useI18n } from '@/lib/i18n/use-i18n'

export function RegisterForm() {
  const router = useRouter()
  const registerUser = useAuthStore((s) => s.register)
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', address: '' },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true)
    try {
      const { firstName, lastName } = splitFullName(values.name)
      await registerUser(firstName, values.phone, values.address, {
        lastName,
      })
      toast.success(t.auth.accountCreatedToast)
      router.push('/account')
    } catch (error) {
      toast.error(friendlyMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t.auth.fullName}</Label>
        <Input id="name" placeholder={t.auth.fullNamePlaceholder} {...register('name')} />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">{t.auth.phone}</Label>
        <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={t.auth.phonePlaceholder} {...register('phone')} />
        {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">{t.auth.address}</Label>
        <Input id="address" autoComplete="street-address" placeholder={t.auth.addressPlaceholder} {...register('address')} />
        {errors.address && <p className="text-xs text-danger">{errors.address.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        {loading ? t.auth.creatingAccount : t.auth.createAccount}
      </Button>

      <p className="text-center text-sm text-muted">
        {t.auth.haveAccount}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t.auth.signInLink}
        </Link>
      </p>
    </form>
  )
}
