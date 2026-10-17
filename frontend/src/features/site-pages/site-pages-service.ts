import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'

export type SitePageKey = 'about' | 'contact' | 'shipping-returns' | 'faq'

export interface SitePageItem {
  title: string
  body: string
  detail: string
  kind: '' | 'phone' | 'email' | 'location' | 'clock'
}

export interface SitePageContent {
  key: SitePageKey
  eyebrow: string
  title: string
  description: string
  imageUrl: string
  imageAlt: string
  items: SitePageItem[]
}

export type SitePageWrite = Omit<SitePageContent, 'key'>

export const DEFAULT_SITE_PAGES: Record<SitePageKey, SitePageContent> = {
  about: {
    key: 'about',
    eyebrow: 'فخر مصري',
    title: 'جمال مستوحى من العلم. صُنع بحب.',
    description:
      'وُلدت شيلايت من إيمان بسيط: كل امرأة تستحق عناية بالبشرة تعمل بجمال مظهرها وروحها. نمزج الخبرة الجلدية مع دفء الضيافة المصرية لنصنع مستحضرات جلدية تثقين بها — وتحبينها.',
    imageUrl: '',
    imageAlt: '',
    items: [
      { title: 'العلم أولاً', body: 'كل تركيبة مبنية على أدلة جلدية — مكونات فعّالة بنسب ذات معنى.', detail: '', kind: '' },
      { title: 'نتائج مرئية', body: 'نقيس نجاحنا بابتسامتكِ أمام المرآة — وليس بوعود التسويق.', detail: '', kind: '' },
      { title: 'نظيف وآمن', body: 'هيبوالرجينيك، خالٍ من القسوة، وتركيبات خالية من المهيّجات غير الضرورية.', detail: '', kind: '' },
      { title: 'فخامة للجميع', body: 'جودة فاخرة بأسعار عادلة، لأن البشرة المتوهجة ليست امتيازاً.', detail: '', kind: '' },
    ],
  },
  contact: {
    key: 'contact',
    eyebrow: 'نحن هنا من أجلك',
    title: 'تواصلي مع شيلايت',
    description: 'أسئلة عن طلب أو روتين أو استرداد؟ فريقنا يرد خلال 24 ساعة.',
    imageUrl: '',
    imageAlt: '',
    items: [
      { title: 'اتصلي بنا', body: '+20 100 000 0000', detail: 'الأحد–الخميس، 10ص–8م', kind: 'phone' },
      { title: 'البريد الإلكتروني', body: 'hello@shelight.eg', detail: 'نرد خلال 24 ساعة', kind: 'email' },
      { title: 'زورينا', body: 'القاهرة، مصر', detail: 'صالة العرض بموعد مسبق', kind: 'location' },
      { title: 'ساعات الدعم', body: '10ص – 8م', detail: 'طوال أيام الأسبوع', kind: 'clock' },
    ],
  },
  'shipping-returns': {
    key: 'shipping-returns',
    eyebrow: 'خدمة التوصيل',
    title: 'الشحن والإرجاع',
    description: 'كل ما تحتاجين معرفته عن توصيل طلبك وخدمة ما بعد البيع.',
    imageUrl: '',
    imageAlt: '',
    items: [
      { title: 'الشحن والتوصيل', body: 'تختلف رسوم التوصيل حسب المحافظة، وتظهر التكلفة النهائية عند إتمام الطلب.', detail: '', kind: '' },
      { title: 'متابعة الطلب', body: 'يمكنك متابعة حالة طلبك من صفحة تتبع الطلب باستخدام رقم الطلب ورقم الهاتف.', detail: '', kind: '' },
      { title: 'الاستبدال والإرجاع', body: 'للاستفسار عن إمكانية الاستبدال أو الإرجاع، يرجى التواصل مع فريق خدمة العملاء مع ذكر رقم الطلب.', detail: '', kind: '' },
    ],
  },
  faq: {
    key: 'faq',
    eyebrow: 'نساعدك',
    title: 'الأسئلة الشائعة',
    description: 'إجابات عن بعض الأسئلة التي قد تساعدك في التسوق.',
    imageUrl: '',
    imageAlt: '',
    items: [
      { title: 'كيف أتابع طلبي؟', body: 'استخدمي صفحة تتبع الطلب وأدخلي رقم الطلب ورقم الهاتف المرتبط به.', detail: '', kind: '' },
      { title: 'كيف أعرف رسوم التوصيل؟', body: 'تظهر رسوم التوصيل بعد اختيار عنوان الشحن وقبل تأكيد الطلب.', detail: '', kind: '' },
      { title: 'كيف أتواصل مع خدمة العملاء؟', body: 'تفضلي بزيارة صفحة تواصل معنا للاطلاع على قنوات التواصل المتاحة.', detail: '', kind: '' },
    ],
  },
}

export const sitePagesService = {
  async getPublicPage(key: SitePageKey): Promise<SitePageContent | null> {
    return apiClient.get<SitePageContent | null>(endpoints.storefrontPages.page(key), { auth: false })
  },

  async getAdminPage(key: SitePageKey): Promise<SitePageContent | null> {
    return apiClient.get<SitePageContent | null>(endpoints.admin.storefrontPage(key))
  },

  async saveAdminPage(key: SitePageKey, payload: SitePageWrite): Promise<SitePageContent> {
    return apiClient.put<SitePageContent>(endpoints.admin.storefrontPage(key), payload)
  },

  async uploadAdminPageImage(key: SitePageKey, file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.postForm<{ path: string }>(
      endpoints.admin.uploadStorefrontPageImage(key),
      formData,
    )
    return response.path
  },
}
