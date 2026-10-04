export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface OrderItem {
  id: string
  productId: string
  name: string
  image: string
  price: number
  quantity: number
}

export interface ShippingAddress {
  fullName: string
  phone: string
  city: string
  governorate?: string
  address: string
  notes?: string
}

export interface Order {
  id: string
  number: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  couponCode?: string
  paymentMethod?: string
  paymentStatus?: string
  shippingAddress: ShippingAddress
  placedAt: string
}

/**
 * نتيجة تتبّع الطلب لزائر بلا حساب.
 * أقل حقولاً من `Order` عمداً: لا عنوان ولا موبايل ولا بريد.
 */
export interface TrackedOrder {
  number: string
  status: OrderStatus
  paymentMethod: string
  paymentStatus: string
  total: number
  itemCount: number
  items: Array<Pick<OrderItem, 'id' | 'name' | 'quantity' | 'price' | 'image'>>
  placedAt: string
  firstName: string
  city: string
  governorate: string
}
