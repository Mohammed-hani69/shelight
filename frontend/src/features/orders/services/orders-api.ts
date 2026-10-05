import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { trackingClient } from '@/features/tracking/tracking-client'
import type { Order, TrackedOrder } from '@/types/order'

/** نموذج الدفع كما يرسله النموذج، قبل تحويله إلى عقد الـ backend. */
export interface CheckoutFormPayload {
  fullName: string
  phone: string
  governorate: string
  governorateKey?: string
  city: string
  address: string
  notes?: string
  paymentMethod: 'cod' | 'card'
  items: Array<{
    productId: string
    quantity: number
    variantId?: string
  }>
  couponCode?: string
  email?: string
  /** معرّف الجلسة ومعرّف الدفع — يُرسلان لتتبّع الرحلة فقط. */
  sessionId?: string
  checkoutKey?: string
}

/** يقسّم الاسم الكامل إلى first/last كما يتوقعه الـ backend. */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

/** يحوّل حمولة النموذج المسطّحة إلى البنية المتداخلة التي يطلبها الـ backend. */
export function toCheckoutRequest(payload: CheckoutFormPayload) {
  const { firstName, lastName } = splitFullName(payload.fullName)
  return {
    email: payload.email,
    shipping: {
      firstName,
      lastName,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      governorate: payload.governorate,
      governorateKey: payload.governorateKey,
      notes: payload.notes ?? '',
    },
    paymentMethod: payload.paymentMethod,
    couponCode: payload.couponCode ?? '',
    items: payload.items.map((item) => ({
      productId: Number(item.productId),
      quantity: item.quantity,
    })),
    sessionId: payload.sessionId,
    checkoutKey: payload.checkoutKey,
  }
}

interface BackendOrderItem {
  id: string
  productId: string | null
  name: string | null
  slug: string
  image: string
  unitPrice: number
  quantity: number
}

interface BackendOrderShipping {
  firstName: string
  lastName: string
  phone: string
  address: string
  city: string
  governorate: string
  notes: string
}

interface BackendOrder {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  shippingCost: number
  discountAmount: number
  total: number
  couponCode: string | null
  paymentMethod: string
  paymentStatus: string
  items: BackendOrderItem[]
  createdAt: string | null
  shipping?: BackendOrderShipping | null
}

function mapBackendOrder(order: BackendOrder): Order {
  const shipping = order.shipping

  return {
    id: String(order.id),
    number: order.orderNumber,
    status: order.status as Order['status'],
    items: (order.items ?? []).map((item) => ({
      id: String(item.id),
      productId: item.productId ?? '',
      name: item.name ?? '',
      image: item.image ?? '',
      price: item.unitPrice,
      quantity: item.quantity,
    })),
    subtotal: order.subtotal ?? 0,
    discount: order.discountAmount ?? 0,
    shipping: order.shippingCost ?? 0,
    total: order.total ?? 0,
    couponCode: order.couponCode ?? undefined,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    shippingAddress: {
      fullName: [shipping?.firstName, shipping?.lastName].filter(Boolean).join(' '),
      phone: shipping?.phone ?? '',
      city: shipping?.city ?? '',
      governorate: shipping?.governorate,
      address: shipping?.address ?? '',
      notes: shipping?.notes || undefined,
    },
    placedAt: order.createdAt ?? '',
  }
}

export const ordersApi = {
  async checkout(data: CheckoutFormPayload): Promise<Order> {
    const anonymousId = trackingClient.anonymousId
    const res = await apiClient.post<BackendOrder>(
      `${endpoints.orders.checkout}?lang=ar`,
      toCheckoutRequest(data),
      anonymousId ? { headers: { 'X-Anonymous-Id': anonymousId } } : undefined
    )
    return mapBackendOrder(res)
  },

  async list(): Promise<Order[]> {
    const res = await apiClient.get<BackendOrder[]>(`${endpoints.orders.list}?lang=ar`)
    return (res ?? []).map(mapBackendOrder)
  },

  /**
   * الـ backend يبحث برقم الطلب (`SL-2026...`) لا بالمعرّف الرقمي للصف.
   * مرّر `Order.number` وليس `Order.id`.
   */
  async getByNumber(orderNumber: string): Promise<Order> {
    const res = await apiClient.get<BackendOrder>(`${endpoints.orders.detail(orderNumber)}?lang=ar`)
    return mapBackendOrder(res)
  },

  /** يعثر على الطلب محلياً بالرقم — للربط بين شاشة الطلب والحساب. */
  async findByOrderNumber(orderNumber: string): Promise<Order | undefined> {
    const orders = await this.list()
    return orders.find((order) => order.number === orderNumber)
  },
}

interface BackendTrackedOrder {
  orderNumber: string
  status: string
  paymentMethod: string
  paymentStatus: string
  total: number
  itemCount: number
  items: BackendOrderItem[]
  placedAt: string | null
  firstName: string | null
  city: string | null
  governorate: string | null
}

/** تتبّع الطلب بلا حساب — برقم الطلب + الموبايل. */
export const orderTrackingApi = {
  async track(orderNumber: string, phone: string): Promise<TrackedOrder> {
    const query = new URLSearchParams({ phone, lang: 'ar' }).toString()
    const res = await apiClient.get<BackendTrackedOrder>(
      `${endpoints.orders.track(encodeURIComponent(orderNumber.trim()))}?${query}`
    )
    return {
      number: res.orderNumber,
      status: res.status as TrackedOrder['status'],
      paymentMethod: res.paymentMethod,
      paymentStatus: res.paymentStatus,
      total: res.total ?? 0,
      itemCount: res.itemCount ?? 0,
      items: (res.items ?? []).map((item) => ({
        id: String(item.id),
        name: item.name ?? '',
        image: item.image ?? '',
        price: item.unitPrice,
        quantity: item.quantity,
      })),
      placedAt: res.placedAt ?? '',
      firstName: res.firstName ?? '',
      city: res.city ?? '',
      governorate: res.governorate ?? '',
    }
  },
}
