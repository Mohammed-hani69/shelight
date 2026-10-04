'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/auth'
import { friendlyMessage } from '@/lib/api/errors'
import { useAdminStore } from '@/store/admin-store'

/** دخول لوحة التحكم — يتحقق الـ backend من صلاحية `isAdmin`. */
export function AdminLoginForm() {
  const router = useRouter()
  const login = useAdminStore((s) => s.login)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    try {
      await login(values.email, values.password)
      router.replace('/admin')
    } catch (error) {
      toast.error(friendlyMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@shelight.com"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        <Lock className="h-4 w-4" aria-hidden="true" />
        {loading ? 'جارٍ الدخول…' : 'دخول لوحة التحكم'}
      </Button>
    </form>
  )
}