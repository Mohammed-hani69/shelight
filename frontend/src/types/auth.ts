export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface AuthCustomer {
  id: string
  email?: string | null
  /** الاسم الأول كما يخزّنه الـ backend. */
  firstName?: string
  /** اسم العائلة كما يخزّنه الـ backend. */
  lastName?: string
  phone?: string | null
  address?: string | null
  city?: string | null
  governorate?: string | null
  birthday?: string | null
  newsletter?: boolean
  loyaltyPoints?: number
  /** صلاحية لوحة التحكم — `true` للمديرين فقط. */
  isAdmin?: boolean
  createdAt?: string | null
}

export interface LoginPayload {
  email?: string
  phone?: string
  password: string
}

export interface RegisterPayload {
  firstName: string
  lastName?: string
  email?: string
  password: string
  phone?: string
  address?: string
  newsletter?: boolean
}

/** الاسم الكامل للعرض فقط — يُشتق من firstName + lastName. */
export function customerFullName(customer: AuthCustomer | null | undefined): string {
  if (!customer) return ''
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ')
}
