/**
 * عقود لوحة التحكم — تطابق استجابات `/admin/*` من الـ backend.
 * كي لا نخلطها بأنواع المتجر، نمسك كل شيء في مساحة أسماء واحدة.
 */

export type AdminOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type AdminPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface AdminDashboardSummary {
  ordersCount: number
  pendingOrders: number
  revenue: number
  productsCount: number
  lowStockCount: number
  customersCount: number
}

export interface AdminCategoryBrief {
  id: string
  slug: string
  name: string
}

export interface AdminImage {
  id: string
  url: string
  alt?: string | null
  /** النص البديل بالإنجليزية — للتحرير في اللوحة (لا يُترجم في هذه العقود). */
  altEn?: string | null
  /** النص البديل بالعربية — للتحرير في اللوحة. */
  altAr?: string | null
}

/** منتج من لوحة التحكم — إخراج `ProductOut` + حقول خام إضافية للتحرير. */
export interface AdminProduct {
  id: string
  slug: string
  name: string
  shortDescription?: string | null
  price: number
  compareAtPrice?: number | null
  stock: number
  inventoryStatus?: string
  tags: string[]
  category?: AdminCategoryBrief | null
  images: AdminImage[]
  isBestseller?: boolean
  isNew?: boolean
  featured?: boolean
  description?: string | null
  benefits?: string[]
  ingredients?: string[]
  howToUse?: string[]
  suitableFor?: string[]
  faqs?: { question: string; answer: string }[]
  variants?: unknown[]
  concerns?: AdminCategoryBrief[]
  rating?: number
  reviewCount?: number
  createdAt?: string | null
  /** حقول خام للتحرير — تُحقن في استجابة `/admin/products`. */
  nameEn?: string
  nameAr?: string
  shortDescriptionEn?: string
  shortDescriptionAr?: string
  descriptionEn?: string
  descriptionAr?: string
  sku?: string
  isActive?: boolean
  categorySlug?: string | null
  concernSlugs?: string[]
}

/** حمولة إنشاء/تحديث منتج — تُرسل بلا تحويل لأن الـ schema يستقبل camelCase. */
export interface AdminProductWrite {
  slug: string
  sku: string
  name_en: string
  name_ar?: string
  short_description_en?: string
  short_description_ar?: string
  description_en?: string
  description_ar?: string
  price: string
  compare_at_price?: string | null
  stock: number
  tags?: string[]
  category_slug?: string | null
  concerns?: string[]
  images?: { url: string; alt_en?: string; alt_ar?: string }[]
  benefits?: string[]
  ingredients?: string[]
  howToUse?: string[]
  suitableFor?: string[]
  faqs?: { question: string; answer: string }[]
  variants?: unknown[]
  isFeatured?: boolean
  isBestseller?: boolean
  isNew?: boolean
  isActive?: boolean
}

export interface AdminCustomer {
  id: string
  email: string | null
  firstName?: string
  lastName?: string
  phone?: string | null
  city?: string | null
  birthday?: string | null
  newsletter?: boolean
  loyaltyPoints?: number
  isAdmin?: boolean
  isActive?: boolean
  createdAt?: string | null
}

export interface AdminCoupon {
  id: string
  code: string
  discountType: 'percent' | 'fixed'
  value: number
  minSpend: number
  usageLimit?: number | null
  usedCount?: number
  validFrom?: string | null
  validUntil?: string | null
  isActive: boolean
}

/** فئة من لوحة التحكم — إخراج `category_admin_payload` من الـ backend. */
export interface AdminCategory {
  id: string
  parentId?: string | null
  parentSlug?: string | null
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  imageUrl?: string | null
  sortOrder: number
  isFeatured: boolean
  isActive: boolean
  productsCount: number
  children?: AdminCategory[]
}

/** بنر من لوحة التحكم — إخراج `banner_payload` من الـ backend. */
export type AdminBannerSection = 'HERO' | 'EDITORIAL'

export interface AdminBanner {
  id: string
  section: AdminBannerSection
  imageUrl: string
  mobileImageUrl?: string | null
  linkUrl?: string | null
  sortOrder: number
  isActive: boolean
}

/** حمولة إنشاء/تحديث بنر — الـ schema يستقبل camelCase مباشرة. */
export interface AdminBannerWrite {
  section: AdminBannerSection
  imageUrl: string
  mobileImageUrl?: string | null
  linkUrl?: string | null
  sortOrder?: number
  isActive?: boolean
}

/** حمولة إنشاء/تحديث فئة — الـ schema يستقبل camelCase مباشرة. */
export interface AdminCategoryWrite {
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  imageUrl?: string | null
  parentSlug?: string | null
  sortOrder?: number
  isFeatured?: boolean
  isActive?: boolean
}

/** حمولة إنشاء/تحديث كوبون — الـ schema يستقبل camelCase مباشرة. */
export interface AdminCouponWrite {
  code?: string
  discountType?: 'percent' | 'fixed'
  value?: string
  minSpend?: string
  usageLimit?: number | null
  validFrom?: string | null
  validUntil?: string | null
  isActive?: boolean
}

/** عضو في باقة من لوحة التحكم — المنتج وكميته داخل الطقم. */
export interface AdminBundleItem {
  productId: string
  productSlug: string
  quantity: number
}

/** باقة من لوحة التحكم — إخراج `bundle_admin_payload` من الـ backend. */
export interface AdminBundle {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  imageUrl?: string
  badgeAr?: string | null
  badgeEn?: string | null
  price: number
  compareAtPrice: number
  /** مجموع أسعار أعضاء الباقة (قبل الخصم). */
  membersTotal: number
  savings: number
  couponCode?: string | null
  isActive: boolean
  sortOrder: number
  itemCount: number
  items: AdminBundleItem[]
}

/** حمولة إنشاء/تحديث باقة — الـ schema يستقبل camelCase مباشرة. */
export interface AdminBundleWrite {
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  imageUrl?: string
  badgeAr?: string
  badgeEn?: string
  price: string
  couponCode?: string
  isActive?: boolean
  sortOrder?: number
  items: { productSlug: string; quantity: number }[]
}

/** مقال مدونة من لوحة التحكم — إخراج `journal_admin_payload` من الـ backend. */
export interface AdminJournalArticle {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  excerptAr: string
  excerptEn: string
  contentAr: string[]
  contentEn: string[]
  category: string
  author: string
  readTime: string
  publishDate: string
  imageUrl: string
  isFeatured: boolean
  isPublished: boolean
}

/** حمولة إنشاء/تحديث مقال — الـ schema يستقبل camelCase مباشرة. */
export interface AdminJournalWrite {
  slug: string
  titleEn: string
  titleAr?: string
  excerptEn?: string
  excerptAr?: string
  contentEn?: string[]
  contentAr?: string[]
  category?: string
  author?: string
  readTime?: string
  publishDate: string
  imageUrl?: string
  isFeatured?: boolean
  isPublished?: boolean
}

export interface AdminOrderItem {
  id: string
  productId?: string | null
  name?: string | null
  slug?: string
  image?: string
  unitPrice: number
  quantity: number
}

export interface AdminOrderShipping {
  firstName: string
  lastName: string
  phone: string
  address: string
  city: string
  governorate: string
  notes?: string
}

/** حالة الشحنة كما يحدّدها webhook مزوّد الشحن (mapped داخلياً). */
export type AdminShipmentStatus =
  | 'pending'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'returning'
  | 'fulfilled'
  | 'exception'
  | 'canceled'
  | 'terminated'
  | 'lost'
  | 'damaged'
  | 'returned_to_stock'
  | 'awaiting_action'

/** بيانات الشحنة القادمة من مزوّد الشحن — للعرض فقط في اللوحة. */
export interface AdminOrderShipment {
  provider?: string | null
  shipmentId?: string | null
  trackingNumber?: string | null
  status?: AdminShipmentStatus | null
  updatedAt?: string | null
}

export interface AdminOrder {
  id: string
  orderNumber: string
  status: AdminOrderStatus
  subtotal: number
  shippingCost: number
  discountAmount: number
  total: number
  couponCode?: string | null
  paymentMethod?: string
  paymentStatus: AdminPaymentStatus
  email?: string | null
  items: AdminOrderItem[]
  createdAt?: string | null
  updatedAt?: string | null
  shipping?: AdminOrderShipping | null
  shipment?: AdminOrderShipment | null
}

/** حقول الشحن القابلة للتعديل من اللوحة — كلها اختيارية. */
export interface AdminOrderShippingUpdate {
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
  city?: string
  governorate?: string
  notes?: string
}

/** الحقول القابلة للتحديث في الطلب من اللوحة. */
export interface AdminOrderUpdate {
  status?: AdminOrderStatus
  paymentStatus?: AdminPaymentStatus
  paymentMethod?: string
  shipping?: AdminOrderShippingUpdate
}

export interface BackendMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
}

//----- تحليلات رحلة العميل -----

/** بطاقة نظرة عامة على حركة الموقع خلال مدة. */
export interface AdminAnalyticsOverview {
  rangeDays: number
  visitors: number
  sessions: number
  pageViews: number
  productViews: number
  addToCarts: number
  checkouts: number
  purchases: number
  revenue: number
  conversionRate: number
  bounceRate: number
  avgEventsPerSession: number
  abandonedCarts: number
  abandonedValue: number
  recoveredCarts: number
  convertedCarts: number
  leads: number
}

/** مرحلة واحدة في مسار التحويل. */
export interface AdminFunnelStep {
  name: string
  label: string
  count: number
  rate: number
}

export interface AdminFunnel {
  rangeDays: number
  steps: AdminFunnelStep[]
}

export type AdminJourneyCartStatus =
  | 'ACTIVE'
  | 'ABANDONED'
  | 'RECOVERED'
  | 'CONVERTED'
  | 'EXPIRED'

export interface AdminJourneyCartItem {
  productId: string
  name?: string | null
  slug?: string | null
  unitPrice: number
  quantity: number
  addedAt?: string | null
  removedAt?: string | null
}

/** سلة رحلة (projection) — منفصلة عن السلة المعاملاتية. */
export interface AdminJourneyCart {
  id: string
  visitorId?: string | null
  customerId?: string | null
  customerEmail?: string | null
  customerName?: string | null
  primaryPhone?: string | null
  secondaryPhone?: string | null
  normalizedPhone?: string | null
  address?: string | null
  city?: string | null
  governorate?: string | null
  leadStatus?: string | null
  recoveryStatus?: string | null
  contactEligible?: boolean | null
  lastCheckoutStep?: string | null
  status: AdminJourneyCartStatus
  currency: string
  itemsCount: number
  subtotal: number
  total: number
  firstItemAddedAt?: string | null
  lastActivityAt?: string | null
  abandonedAt?: string | null
  recoveredAt?: string | null
  convertedAt?: string | null
  items: AdminJourneyCartItem[]
}

/** زائر مجهول (أو مرتبط بعميل) مع مصدر أول زيارة. */
export interface AdminVisitor {
  id: string
  customerId?: string | null
  customerEmail?: string | null
  customerName?: string | null
  primaryPhone?: string | null
  secondaryPhone?: string | null
  firstSeenAt?: string | null
  lastSeenAt?: string | null
  sessionsCount: number
  eventsCount: number
  deviceType?: string | null
  firstLandingUrl?: string | null
  firstReferrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
}

export interface AdminTimelineEvent {
  id: string
  eventId: string
  name: string
  visitorId?: string | null
  sessionId?: string | null
  customerId?: string | null
  timestamp?: string | null
  pageUrl?: string | null
  referrer?: string | null
  path?: string | null
  properties: Record<string, unknown>
}

export type AdminCheckoutStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

/** جلسة دفع — مرحلتها الأخيرة تُظهر مكان توقف العميل. */
export interface AdminCheckoutSession {
  id: string
  checkoutKey: string
  visitorId?: string | null
  customerId?: string | null
  status: AdminCheckoutStatus
  step?: string | null
  email?: string | null
  itemsCount: number
  subtotal: number
  discount: number
  shipping: number
  total: number
  paymentMethod?: string | null
  couponCode?: string | null
  startedAt?: string | null
  completedAt?: string | null
  lastActivityAt?: string | null
}

export interface AdminCustomerTimeline {
  customer: { id: string; email: string; firstName?: string; lastName?: string } | null
  events: AdminTimelineEvent[]
  carts: AdminJourneyCart[]
  checkoutSessions: AdminCheckoutSession[]
}

export interface AdminVisitorTimeline {
  visitor: AdminVisitor | null
  events: AdminTimelineEvent[]
  carts: AdminJourneyCart[]
  checkoutSessions: AdminCheckoutSession[]
}