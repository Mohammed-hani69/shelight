import type { Metadata } from 'next'
import { Alexandria, Tajawal } from 'next/font/google'
import { dir } from '@/lib/i18n'
import { config } from '@/config/site'
import { Providers } from '@/components/providers/providers'
import '@/app/globals.css'

// Alexandria للعناوين: خط variable (100–900) ⇒ لا نحدد weight
const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-alexandria',
})

// Tajawal لنصوص الموقع: خط static ولا يحتوي وزن 600، لذا نحدد الأوزان المتاحة فقط.
// نقتصر على 400/500/700 (التي تستخدمها Components فعلياً) لتقليل وزن الصفحة على الموبايل.
const tajawal = Tajawal({
  weight: ['400', '500', '700'],
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-tajawal',
})

export const metadata: Metadata = {
  title: {
    default: 'شيلايت | عناية ببشرتك وشعرك في مصر',
    template: '%s | SHE LIGHT',
  },
  description:
    'اتسوّقي منتجات شيلايت للعناية ببشرتك وشعرك وجسمك في مصر. اكتشفي الغسول والمرطبات والسيروم والزيوت واختاري روتين يناسبك.',
  keywords: [
    'مستحضرات تجميل في مصر',
    'منتجات العناية بالبشرة',
    'منتجات العناية بالشعر',
    'روتين العناية بالبشرة',
    'غسول الوجه',
    'مرطب للبشرة',
    'سيروم للبشرة',
    'زيوت طبيعية للشعر',
    'العناية بالبشرة الدهنية',
    'العناية بالبشرة الجافة',
    'مستحضرات العناية بالجسم',
    'SHE LIGHT',
  ],
  openGraph: {
    title: 'شيلايت | عناية ببشرتك وشعرك في مصر',
    description:
      'اكتشفي منتجات شيلايت للعناية ببشرتك وشعرك وجسمك واختاري روتين يناسبك.',
    type: 'website',
    locale: 'ar_EG',
    siteName: 'SHE LIGHT',
    images: [{ url: '/images/hero/hero-1.webp', alt: 'منتجات شيلايت للعناية والجمال' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'شيلايت | عناية ببشرتك وشعرك في مصر',
    description: 'اتسوّقي منتجات شيلايت للعناية ببشرتك وشعرك وجسمك.',
    images: ['/images/hero/hero-1.webp'],
  },
  metadataBase: new URL(config.site.url),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${alexandria.variable} ${tajawal.variable}`}
    >
      {/* suppressHydrationWarning: بعض إضافات المتصفح (مثل Smart Converter)
          تُضيف سمات إلى <body> قبل تشغيل React فتُطلق تحذير hydration */}
      <body suppressHydrationWarning>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1646327953504209&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// re-export dir helper for consumers
export { dir }
