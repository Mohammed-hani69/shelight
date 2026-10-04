'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { phoneLoginSchema, type PhoneLoginFormValues } from '@/features/auth/schemas/auth'
import { useAuthStore } from '@/store/auth-store'
import { friendlyMessage } from '@/lib/api/errors'
import { useI18n } from '@/lib/i18n/use-i18n'

export function LoginForm() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneLoginFormValues>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { identifier: '', password: '' },
  })

  const onSubmit = async (values: PhoneLoginFormValues) => {
    setLoading(true)
    try {
      await login(values.identifier, values.password)
      toast.success(t.auth.welcomeBackToast)
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
        <Label htmlFor="identifier">{t.auth.loginIdentifier}</Label>
        <Input id="identifier" type="text" autoComplete="username" placeholder={t.auth.loginIdentifierPlaceholder} {...register('identifier')} />
        {errors.identifier && <p className="text-xs text-danger">{errors.identifier.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input id="password" type="password" autoComplete="current-password" placeholder={t.auth.passwordPlaceholder} {...register('password')} />
        {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
      </div>

      <p className="text-xs leading-5 text-muted">{t.auth.phonePasswordHint}</p>

      <Button type="submit" className="w-full" disabled={loading}>
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {loading ? t.auth.signingIn : t.auth.signIn}
      </Button>

      <p className="text-center text-sm text-muted">
        {t.auth.noAccount}{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t.auth.createOne}
        </Link>
      </p>
    </form>
  )
}
