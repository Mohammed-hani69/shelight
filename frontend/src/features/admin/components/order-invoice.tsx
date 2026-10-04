import { config } from '@/config/site'
import { formatPrice } from '@/lib/utils/format-price'
import type { AdminOrder, AdminOrderStatus, AdminPaymentStatus } from '@/types/admin'

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}

const PAYMENT_STATUS_LABELS: Record<AdminPaymentStatus, string> = {
  pending: 'معلّق',
  paid: 'مدفوع',
  failed: 'فشل الدفع',
  refunded: 'مسترجع',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'الدفع عند الاستلام',
  card: 'بطاقة بنكية',
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * فاتورة الطلب القابلة للطباعة — تُعرض وحدها عند الطباعة.
 *
 * تصميم مستقل عن واجهة اللوحة (بلا أزرار تحكم)، بخلفية بيضاء وحدود واضحة
 * تناسب الورق. تُطبع عبر `window.print()` من صفحة تفاصيل الطلب.
 */
export function OrderInvoice({ order }: { order: AdminOrder }) {
  const shipping = order.shipping
  const customerName =
    [shipping?.firstName, shipping?.lastName].filter(Boolean).join(' ') || 'عميل'

  return (
    <div dir="rtl" className="mx-auto max-w-[820px] bg-white p-8 text-charcoal">
      <header className="flex items-start justify-between border-b-2 border-plum pb-4">
        <div>
          <p className="font-display text-2xl font-bold text-plum">{config.site.name}</p>
          <p className="mt-1 text-xs text-muted">{config.site.description}</p>
        </div>
        <div className="text-left">
          <p className="text-lg font-semibold">فاتورة</p>
          <p className="mt-1 text-xs text-muted">رقم الطلب</p>
          <p className="font-mono text-sm font-semibold" dir="ltr">
            {order.orderNumber}
          </p>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-semibold text-muted">بيانات العميل</p>
          <p className="font-medium">{customerName}</p>
          {order.shipping?.phone && (
            <p dir="ltr" className="text-muted">
              {order.shipping.phone}
            </p>
          )}
          {order.email && (
            <p dir="ltr" className="text-muted">
              {order.email}
            </p>
          )}
          {shipping?.address && (
            <p className="mt-1 text-muted">
              {shipping.address}
              {shipping.city ? ` - ${shipping.city}` : ''}
              {shipping.governorate ? ` - ${shipping.governorate}` : ''}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-semibold text-muted">تفاصيل الطلب</p>
          <p>
            <span className="text-muted">التاريخ: </span>
            {formatDate(order.createdAt)}
          </p>
          <p>
            <span className="text-muted">الحالة: </span>
            {STATUS_LABELS[order.status]}
          </p>
          <p>
            <span className="text-muted">الدفع: </span>
            {PAYMENT_METHOD_LABELS[order.paymentMethod ?? ''] ?? order.paymentMethod ?? '—'} —{' '}
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </p>
        </div>
      </section>

      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-charcoal text-right text-xs">
            <th className="py-2 font-semibold">#</th>
            <th className="py-2 font-semibold">المنتج</th>
            <th className="py-2 font-semibold">سعر الوحدة</th>
            <th className="py-2 font-semibold">الكمية</th>
            <th className="py-2 font-semibold">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={item.id} className="border-b border-border text-right align-top">
              <td className="py-2">{index + 1}</td>
              <td className="py-2">
                <p className="font-medium">{item.name ?? 'منتج'}</p>
                {item.slug && (
                  <p className="text-xs text-muted" dir="ltr">
                    {item.slug}
                  </p>
                )}
              </td>
              <td className="py-2">{formatPrice(item.unitPrice)}</td>
              <td className="py-2">{item.quantity}</td>
              <td className="py-2 font-medium">{formatPrice(item.unitPrice * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-4 flex justify-end">
        <dl className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">المجموع الفرعي</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">الشحن</dt>
            <dd>{formatPrice(order.shippingCost)}</dd>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>
                الخصم{order.couponCode ? ` (${order.couponCode})` : ''}
              </dt>
              <dd>- {formatPrice(order.discountAmount)}</dd>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t-2 border-plum pt-2 text-base font-bold">
            <dt>الإجمالي</dt>
            <dd dir="ltr">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>

      {shipping?.notes && (
        <section className="mt-4 rounded-lg border border-border p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-muted">ملاحظات</p>
          <p>{shipping.notes}</p>
        </section>
      )}

      <footer className="mt-6 border-t border-border pt-3 text-center text-xs text-muted">
        شكراً لتعاملكم مع {config.site.name} — هذه الفاتورة صادرة إلكترونياً.
      </footer>
    </div>
  )
}
