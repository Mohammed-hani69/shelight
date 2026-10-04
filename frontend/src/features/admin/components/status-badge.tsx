import type {
  AdminOrderStatus,
  AdminPaymentStatus,
  AdminShipmentStatus,
} from '@/types/admin'
import { cn } from '@/lib/utils/cn'

/** الألوان الموحدة لحالات الطلب في جدول اللوحة. */
const ORDER_STATUS_STYLES: Record<AdminOrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

const ORDER_STATUS_LABELS: Record<AdminOrderStatus, string> = {
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

const SHIPMENT_STATUS_STYLES: Record<AdminShipmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  picked_up: 'bg-sky-100 text-sky-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  returning: 'bg-violet-100 text-violet-700',
  fulfilled: 'bg-sky-100 text-sky-700',
  exception: 'bg-rose-100 text-rose-700',
  canceled: 'bg-rose-100 text-rose-700',
  terminated: 'bg-rose-100 text-rose-700',
  lost: 'bg-rose-100 text-rose-700',
  damaged: 'bg-rose-100 text-rose-700',
  returned_to_stock: 'bg-violet-100 text-violet-700',
  awaiting_action: 'bg-amber-100 text-amber-700',
}

const SHIPMENT_STATUS_LABELS: Record<AdminShipmentStatus, string> = {
  pending: 'في المستودع',
  picked_up: 'تم الاستلام',
  out_for_delivery: 'خرجت للتوصيل',
  delivered: 'تم التسليم',
  returning: 'في طريقها للإرجاع',
  fulfilled: 'تم التجهيز',
  exception: 'استثناء',
  canceled: 'ملغاة من المزوّد',
  terminated: 'منتهية',
  lost: 'مفقودة',
  damaged: 'تالفة',
  returned_to_stock: 'أُعيدت للمخزون',
  awaiting_action: 'بانتظار إجراء',
}

export function OrderStatusBadge({ status }: { status: AdminOrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        ORDER_STATUS_STYLES[status]
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}

export function PaymentStatusBadge({ status }: { status: AdminPaymentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'paid'
          ? 'bg-emerald-100 text-emerald-700'
          : status === 'pending'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-rose-100 text-rose-700'
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  )
}

/** حالة الشحنة كما وصلت من webhook مزوّد الشحن. */
export function ShipmentStatusBadge({ status }: { status: AdminShipmentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        SHIPMENT_STATUS_STYLES[status]
      )}
    >
      {SHIPMENT_STATUS_LABELS[status]}
    </span>
  )
}