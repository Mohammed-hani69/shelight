'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Link2, LoaderCircle, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminApi } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { formatPrice } from '@/lib/utils/format-price'
import type { AdminReferralLink, AdminReferralOrder } from '@/types/admin'
import type { BackendMeta } from '@/lib/api/backend-mappers'

export function ReferralsManager() {
  const [links, setLinks] = useState<AdminReferralLink[]>([])
  const [orders, setOrders] = useState<AdminReferralOrder[]>([])
  const [meta, setMeta] = useState<BackendMeta | null>(null)
  const [page, setPage] = useState(1)
  const [origin, setOrigin] = useState('')
  const [inviterName, setInviterName] = useState('')
  const [inviterPhone, setInviterPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (requestedPage = page) => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.getReferrals(requestedPage)
      setLinks(result.items.links)
      setOrders(result.items.orders)
      setMeta(result.meta ?? null)
    } catch (err) {
      setError(friendlyMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setOrigin(window.location.origin)
    void load(1)
  }, [])

  const createLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreating(true)
    try {
      const link = await adminApi.createReferral({
        inviterName: inviterName.trim(),
        inviterPhone: inviterPhone.trim(),
      })
      setLinks((current) => [link, ...current])
      setInviterName('')
      setInviterPhone('')
      toast.success('اتعمل رابط الإحالة')
    } catch (err) {
      toast.error(friendlyMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const copyLink = async (code: string) => {
    const url = `${origin}/r/${encodeURIComponent(code)}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('اتنسخ الرابط')
    } catch {
      toast.error('مقدرناش ننسخ الرابط تلقائي. انسخه من خانة الرابط.')
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-plum">
          <Share2 className="h-5 w-5" aria-hidden="true" />
          اعمل رابط دعوة
        </h2>
        <p className="mb-5 text-sm text-muted">
          اكتب اسم ورقم صاحب الدعوة، وبعدها ابعتله الرابط. أي طلب يتعمل من خلاله هيتسجل هنا.
        </p>
        <form onSubmit={createLink} className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="inviter-name">اسم صاحب الدعوة</Label>
            <Input
              id="inviter-name"
              value={inviterName}
              onChange={(event) => setInviterName(event.target.value)}
              minLength={2}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inviter-phone">رقم موبايل صاحب الدعوة</Label>
            <Input
              id="inviter-phone"
              type="tel"
              value={inviterPhone}
              onChange={(event) => setInviterPhone(event.target.value)}
              minLength={8}
              maxLength={32}
              required
            />
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? <LoaderCircle className="animate-spin" /> : <Link2 />}
            {creating ? 'بيتحضر...' : 'إنشاء الرابط'}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-plum">روابط الدعوة</h2>
        {links.length === 0 && !loading ? (
          <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
            لسه مفيش روابط دعوة. اعمل أول رابط من النموذج اللي فوق.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-accent/30 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">صاحب الدعوة</th>
                  <th className="px-4 py-3 font-medium">رقم الموبايل</th>
                  <th className="px-4 py-3 font-medium">الرابط</th>
                  <th className="px-4 py-3 font-medium">نسخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {links.map((link) => (
                  <tr key={link.id}>
                    <td className="px-4 py-3 font-medium">{link.inviterName}</td>
                    <td className="px-4 py-3" dir="ltr">{link.inviterPhone}</td>
                    <td className="px-4 py-3">
                      <Input
                        readOnly
                        value={origin ? `${origin}/r/${link.code}` : ''}
                        aria-label={`رابط دعوة ${link.inviterName}`}
                        className="min-w-[300px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!origin}
                        onClick={() => void copyLink(link.code)}
                      >
                        <Copy aria-hidden="true" />
                        نسخ
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-plum">الطلبات اللي جت من إحالة</h2>
          <p className="mt-1 text-sm text-muted">بيانات صاحب الدعوة والمدعو وقيمة كل طلب.</p>
        </div>
        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            <p>{error}</p>
            <Button className="mt-3" variant="outline" size="sm" onClick={() => void load(page)}>
              جرّب تاني
            </Button>
          </div>
        ) : loading ? (
          <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
            بنحمّل طلبات الإحالة...
          </p>
        ) : orders.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
            لسه مفيش طلبات اتعملت من روابط الإحالة.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[900px] text-right text-sm">
                <thead className="bg-accent/30 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">صاحب الدعوة</th>
                    <th className="px-4 py-3 font-medium">رقمه</th>
                    <th className="px-4 py-3 font-medium">المدعو</th>
                    <th className="px-4 py-3 font-medium">رقم المدعو</th>
                    <th className="px-4 py-3 font-medium">رقم الطلب</th>
                    <th className="px-4 py-3 font-medium">سعر الطلب</th>
                    <th className="px-4 py-3 font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-medium">{order.inviterName}</td>
                      <td className="px-4 py-3" dir="ltr">{order.inviterPhone}</td>
                      <td className="px-4 py-3">{order.invitedName}</td>
                      <td className="px-4 py-3" dir="ltr">{order.invitedPhone}</td>
                      <td className="px-4 py-3">{order.orderNumber}</td>
                      <td className="px-4 py-3">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString('ar-EG')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted">
                  صفحة {meta.page} من {meta.totalPages} — {meta.total} طلب
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => {
                      const nextPage = page - 1
                      setPage(nextPage)
                      void load(nextPage)
                    }}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!meta.hasNextPage}
                    onClick={() => {
                      const nextPage = page + 1
                      setPage(nextPage)
                      void load(nextPage)
                    }}
                  >
                    اللي بعده
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
