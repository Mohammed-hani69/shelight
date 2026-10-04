import type { Metadata } from 'next'
import { Alexandria, Tajawal } from 'next/font/google'
import { dir } from '@/lib/i18n'
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
    default: 'SHE LIGHT — مستحضرات جلدية فاخرة',
    template: '%s | SHE LIGHT',
  },
  description:
    'SHE LIGHT تقدم مستحضرات جلدية مصرية فاخرة تشمل العناية بالبشرة والشعر والعين والأظافر والعناية بالأطفال — جمال مستوحى سريرياً لإشراقتكِ.',
  keywords: [
    'مستحضرات جلدية',
    'العناية بالبشرة في مصر',
    'مستحضرات تجميل فاخرة',
    'العناية بالشعر',
    'العناية بالعين',
    'العناية بالأظافر',
    'SHE LIGHT',
  ],
  openGraph: {
    title: 'SHE LIGHT — مستحضرات جلدية فاخرة',
    description:
      'جمال مستوحى سريرياً لإشراقتكِ. تسوّقي العناية الفاخرة بالبشرة والشعر والجسم.',
    type: 'website',
    locale: 'ar_EG',
    siteName: 'SHE LIGHT',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SHE LIGHT — مستحضرات جلدية فاخرة',
    description: 'جمال مستوحى سريرياً لإشراقتكِ.',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// re-export dir helper for consumers
export { dir }
