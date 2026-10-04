/**
 * خدمات لوحة التحكم — كل الطلبات تمر عبر `apiClient` بنفس قواعد المتجر.
 * لا نخلط بيانات اللوحة بمسارات المتجر العامة هنا.
 */

import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { formatPrice } from '@/lib/utils/format-price'
import type { BackendMeta } from '@/lib/api/backend-mappers'
import type {
  AdminAnalyticsOverview,
  AdminBanner,
  AdminBannerWrite,
  AdminBundle,
  AdminBundleWrite,
  AdminCategory,
  AdminCategoryWrite,
  AdminCoupon,
  AdminCouponWrite,
  AdminCustomer,
  AdminCustomerTimeline,
  AdminDashboardSummary,
  AdminFunnel,
  AdminJournalArticle,
  AdminJournalWrite,
  AdminJourneyCart,
  AdminOrder,
  AdminOrderUpdate,
  AdminProduct,
  AdminProductWrite,
  AdminVisitor,
  AdminVisitorTimeline,
} from '@/types/admin'
import type { AuthCustomer } from '@/types/auth'

/** استجابة `/admin/login`: توكن + بيانات المدير. */
interface AdminLoginResponse {
  accessToken: string
  refreshToken?: string
  customer: AuthCustomer
}

/** قائمة موقّعة (للمنتجات/الطلبات/العملاء تُرجع `meta` للترقيم). */
interface Paged<T> {
  items: T
  meta?: BackendMeta
}

export const adminApi = {
  /** دخول لوحة التحكم — لا يمرر الـ Authorization أثناء تسجيل الدخول. */
  async login(email: string, password: string): Promise<AdminLoginResponse> {
    return apiClient.post<AdminLoginResponse>(endpoints.admin.login, { email, password }, { auth: false })
  },

  /** بيانات الهوية الحالية — يُستخدم للتحقق من صلاحية `isAdmin`. */
  async getMe(): Promise<AuthCustomer> {
    const res = await apiClient.get<{ customer: AuthCustomer }>(endpoints.auth.me)
    return res.customer
  },

  async dashboard(): Promise<AdminDashboardSummary> {
    return apiClient.get<AdminDashboardSummary>(endpoints.admin.dashboard)
  },

  //----- منتجات -----
  async listProducts(options: { page?: number; search?: string; category?: string; pageSize?: number } = {}): Promise<Paged<AdminProduct[]>> {
    const query = new URLSearchParams()
    if (options.page) query.set('page', String(options.page))
    if (options.search) query.set('search', options.search)
    if (options.category) query.set('category', options.category)
    if (options.pageSize) query.set('page_size', String(options.pageSize))
    const suffix = query.size ? `?${query.toString()}` : ''
    return apiClient.getWithMeta<AdminProduct[], BackendMeta>(
      `${endpoints.admin.products}${suffix}`
    )
  },

  async getProduct(id: string): Promise<AdminProduct> {
    return apiClient.get<AdminProduct>(endpoints.admin.product(id))
  },

  async createProduct(payload: AdminProductWrite): Promise<AdminProduct> {
    return apiClient.post<AdminProduct>(endpoints.admin.products, payload)
  },

  async updateProduct(id: string, payload: AdminProductWrite): Promise<AdminProduct> {
    return apiClient.put<AdminProduct>(endpoints.admin.product(id), payload)
  },

  /**
   * رفع صورة منتج — يعيد المسار النسبي الذي يُحفظ لاحقاً ضمن
   * `images[].url`. الرفع منفصل عن حفظ المنتج عمداً: طلب الحفظ JSON صغير،
   * والرفع ملف ثنائي بسقف أكبر.
   */
  async uploadProductImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.postForm<{ path: string }>(
      endpoints.admin.uploadProductImage,
      formData
    )
    return res.path
  },

  /** حذف منطقي — يُخفي المنتج عن المتجر. */
  async deleteProduct(id: string): Promise<boolean> {
    const res = await apiClient.delete<{ isActive: boolean }>(endpoints.admin.product(id))
    return res.isActive === false
  },

  //----- طلبات -----
  async listOrders(status?: string): Promise<Paged<AdminOrder[]>> {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : ''
    return apiClient.getWithMeta<AdminOrder[], BackendMeta>(`${endpoints.admin.orders}${suffix}`)
  },

  async getOrder(orderNumber: string): Promise<AdminOrder> {
    return apiClient.get<AdminOrder>(endpoints.admin.order(orderNumber))
  },

  async updateOrder(orderNumber: string, payload: AdminOrderUpdate): Promise<AdminOrder> {
    return apiClient.patch<AdminOrder>(endpoints.admin.order(orderNumber), payload)
  },

  //----- كوبونات -----
  async listCoupons(): Promise<AdminCoupon[]> {
    return apiClient.get<AdminCoupon[]>(endpoints.admin.coupons)
  },

  async createCoupon(payload: AdminCouponWrite): Promise<AdminCoupon> {
    return apiClient.post<AdminCoupon>(endpoints.admin.coupons, payload)
  },

  async updateCoupon(id: string, payload: AdminCouponWrite): Promise<AdminCoupon> {
    return apiClient.patch<AdminCoupon>(endpoints.admin.coupon(id), payload)
  },

  async deleteCoupon(id: string): Promise<void> {
    await apiClient.delete(endpoints.admin.coupon(id))
  },

  //----- عملاء -----
  async listCustomers(search?: string): Promise<Paged<AdminCustomer[]>> {
    const suffix = search ? `?search=${encodeURIComponent(search)}` : ''
    return apiClient.getWithMeta<AdminCustomer[], BackendMeta>(`${endpoints.admin.customers}${suffix}`)
  },

  async updateCustomer(id: string, payload: { isActive?: boolean; loyaltyPoints?: number }): Promise<AdminCustomer> {
    return apiClient.patch<AdminCustomer>(endpoints.admin.customer(id), payload)
  },

  //----- فئات / أقسام -----
  /** شجرة الفئات كاملة (نشطة ومخفية) مع عدد المنتجات لإدارة أقسام الموقع. */
  async listCategories(): Promise<AdminCategory[]> {
    return apiClient.get<AdminCategory[]>(endpoints.admin.categories)
  },

  async getCategory(id: string): Promise<AdminCategory> {
    return apiClient.get<AdminCategory>(endpoints.admin.category(id))
  },

  async createCategory(payload: AdminCategoryWrite): Promise<AdminCategory> {
    return apiClient.post<AdminCategory>(endpoints.admin.categories, payload)
  },

  async updateCategory(id: string, payload: AdminCategoryWrite): Promise<AdminCategory> {
    return apiClient.put<AdminCategory>(endpoints.admin.category(id), payload)
  },

  /** تحديث جزئي — للأزرار السريعة (تمييز/إخفاء/ترتيب). */
  async patchCategory(id: string, payload: Partial<AdminCategoryWrite>): Promise<AdminCategory> {
    return apiClient.patch<AdminCategory>(endpoints.admin.category(id), payload)
  },

  /** إخفاء منطقي — تختفي الفئة من الرئيسية والتنقل دون حذف السجل. */
  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(endpoints.admin.category(id))
  },

  async moveCategory(id: string, direction: 'up' | 'down'): Promise<void> {
    await apiClient.post(endpoints.admin.moveCategory(id), { direction })
  },

  //----- باقات (طقوس جاهزة) -----
  /** كل الباقات (نشطة ومخفية) مع أعضائها — لإدارة عروض الأطقم. */
  async listBundles(): Promise<AdminBundle[]> {
    return apiClient.get<AdminBundle[]>(endpoints.admin.bundles)
  },

  async getBundle(id: string): Promise<AdminBundle> {
    return apiClient.get<AdminBundle>(endpoints.admin.bundle(id))
  },

  async createBundle(payload: AdminBundleWrite): Promise<AdminBundle> {
    return apiClient.post<AdminBundle>(endpoints.admin.bundles, payload)
  },

  async updateBundle(id: string, payload: AdminBundleWrite): Promise<AdminBundle> {
    return apiClient.put<AdminBundle>(endpoints.admin.bundle(id), payload)
  },

  /** تحديث جزئي — للأزرار السريعة (إخفاء/تفعيل/ترتيب). */
  async patchBundle(id: string, payload: Partial<AdminBundleWrite>): Promise<AdminBundle> {
    return apiClient.patch<AdminBundle>(endpoints.admin.bundle(id), payload)
  },

  /** إخفاء منطقي — تُزال من المتجر وتُعطَّل كوبونها. */
  async deleteBundle(id: string): Promise<void> {
    await apiClient.delete(endpoints.admin.bundle(id))
  },

  async moveBundle(id: string, direction: 'up' | 'down'): Promise<void> {
    await apiClient.post(endpoints.admin.moveBundle(id), { direction })
  },

  //----- مدونة (مقالات) -----
  /** كل المقالات (منشورة ومخفية) — لإدارة محتوى المدونة. */
  async listArticles(): Promise<AdminJournalArticle[]> {
    return apiClient.get<AdminJournalArticle[]>(endpoints.admin.journal)
  },

  async getArticle(id: string): Promise<AdminJournalArticle> {
    return apiClient.get<AdminJournalArticle>(endpoints.admin.article(id))
  },

  async createArticle(payload: AdminJournalWrite): Promise<AdminJournalArticle> {
    return apiClient.post<AdminJournalArticle>(endpoints.admin.journal, payload)
  },

  async updateArticle(id: string, payload: AdminJournalWrite): Promise<AdminJournalArticle> {
    return apiClient.put<AdminJournalArticle>(endpoints.admin.article(id), payload)
  },

  /** تحديث جزئي سريع — تمييز/نشر/إخفاء دون إعادة فتح النموذج. */
  async patchArticle(
    id: string,
    payload: Partial<AdminJournalWrite>
  ): Promise<AdminJournalArticle> {
    return apiClient.patch<AdminJournalArticle>(endpoints.admin.article(id), payload)
  },

  /** إخفاء منطقي — يختفي المقال من المدونة دون فقد محتواه. */
  async deleteArticle(id: string): Promise<void> {
    await apiClient.delete(endpoints.admin.article(id))
  },

  //----- بنرات الصفحة الرئيسية -----
  /** كل البنرات (نشطة ومخفية) لإدارة الهيرو والإديتوريال. */
  async listBanners(): Promise<AdminBanner[]> {
    return apiClient.get<AdminBanner[]>(endpoints.admin.banners)
  },

  async createBanner(payload: AdminBannerWrite): Promise<AdminBanner> {
    return apiClient.post<AdminBanner>(endpoints.admin.banners, payload)
  },

  async updateBanner(id: string, payload: AdminBannerWrite): Promise<AdminBanner> {
    return apiClient.put<AdminBanner>(endpoints.admin.banner(id), payload)
  },

  /** تحديث جزئي — للأزرار السريعة (إظهار/إخفاء/ترتيب). */
  async patchBanner(id: string, payload: Partial<AdminBannerWrite>): Promise<AdminBanner> {
    return apiClient.patch<AdminBanner>(endpoints.admin.banner(id), payload)
  },

  /** إخفاء منطقي — يختفي البنر من الموقع دون حذف السجل. */
  async deleteBanner(id: string): Promise<void> {
    await apiClient.delete(endpoints.admin.banner(id))
  },

  async moveBanner(id: string, direction: 'up' | 'down'): Promise<void> {
    await apiClient.post(endpoints.admin.moveBanner(id), { direction })
  },

  /** رفع صورة بنر — يعيد المسار النسبي المخزَّن في الـ backend. */
  async uploadBannerImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.postForm<{ path: string }>(endpoints.admin.uploadBanner, formData)
    return res.path
  },

  //----- تحليلات رحلة العميل -----
  async analyticsOverview(days = 30): Promise<AdminAnalyticsOverview> {
    return apiClient.get<AdminAnalyticsOverview>(
      `${endpoints.admin.analytics.overview}?days=${days}`
    )
  },

  async analyticsFunnel(days = 30): Promise<AdminFunnel> {
    return apiClient.get<AdminFunnel>(`${endpoints.admin.analytics.funnel}?days=${days}`)
  },

  async analyticsAbandonedCarts(days = 30): Promise<AdminJourneyCart[]> {
    return apiClient.get<AdminJourneyCart[]>(
      `${endpoints.admin.analytics.abandonedCarts}?days=${days}`
    )
  },

  async analyticsVisitors(days = 30): Promise<AdminVisitor[]> {
    return apiClient.get<AdminVisitor[]>(`${endpoints.admin.analytics.visitors}?days=${days}`)
  },

  async customerTimeline(id: string): Promise<AdminCustomerTimeline> {
    return apiClient.get<AdminCustomerTimeline>(endpoints.admin.analytics.customerTimeline(id))
  },

  async visitorTimeline(id: string): Promise<AdminVisitorTimeline> {
    return apiClient.get<AdminVisitorTimeline>(endpoints.admin.analytics.visitorTimeline(id))
  },

  /** تشغيل يدوي لفحص السلال المتروكة — idempotent. */
  async runAbandonment(): Promise<{ abandoned: number }> {
    return apiClient.post<{ abandoned: number }>(endpoints.admin.analytics.runAbandonment)
  },

  //----- إعدادات الشحن -----
  async getBostaSettings(): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>(endpoints.admin.shipping.bosta)
  },

  async saveBostaSettings(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiClient.post<Record<string, unknown>>(endpoints.admin.shipping.bosta, payload)
  },

  async updateBostaSettings(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiClient.put<Record<string, unknown>>(endpoints.admin.shipping.bosta, payload)
  },

  async testBostaConnection(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiClient.post<Record<string, unknown>>(endpoints.admin.shipping.testBosta, payload)
  },

  async enableBostaIntegration(): Promise<Record<string, unknown>> {
    return apiClient.post<Record<string, unknown>>(endpoints.admin.shipping.enableBosta, { enabled: true })
  },

  async disableBostaIntegration(): Promise<Record<string, unknown>> {
    return apiClient.post<Record<string, unknown>>(endpoints.admin.shipping.disableBosta, { enabled: false })
  },
}

/** تنسيق المبالغ بنفس صيغة المتجر الموحدة (1,299.00 LE). */
export function formatAmount(value: number | undefined | null): string {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return formatPrice(number)
}