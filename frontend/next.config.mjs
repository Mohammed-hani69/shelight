/** تكوين Next.js */
const apiUrl = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'
)

const nextConfig = {
  // مؤشر أدوات التطوير يظهر أسفل يسار الشاشة (وهو موضع زر «الحقيبة» في RTL)
  // ويعترض اللمس على شريط الموبايل السفلي، لذا نعطّله في التطوير فقط.
  // الأخطاء وقت الترجمة/التشغيل ما زالت تظهر.
  devIndicators: false,
  // السماح لأجهزة الشبكة المحلية (الهاتف) بتحميل موارد التطوير. بدونها يحجب
  // Next طلبات /_next القادمة من عنوان غير localhost، فلا تُهيَّأ الواجهة
  // (React hydration) ويظهر المحتوى لكن تتعطّل كل التفاعلات: زر الحقيبة
  // وسلايدر البانر وغيرهما. القيمة تشمل IP الحالي ونطاق الشبكة المحلية.
  // 127.0.0.1 ضرورية أيضاً: القائمة المدمجة في Next تحتوي localhost فقط،
  // والبحث يتم باسم المضيف لا بالـ origin كاملاً، فبدونها يُرَدّ ترقية
  // Websocket الخاصة بـ HMR بـ 403 عند فتح الواجهة عبر 127.0.0.1.
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.7',
    '192.168.*.*',
    apiUrl.hostname,
  ],
  images: {
    // الـ backend المحلي يعمل على عنوان شبكة خاصة (192.168.x.x)؛ Next 16
    // يحجب الصور من عناوين private افتراضياً لحماية SSRF، وهنا مقصود.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // صور البنرات تتبع عنوان الـ API حتى تعمل على أي IP محلي مضبوط في env.
      {
        protocol: apiUrl.protocol.slice(0, -1),
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: '/uploads/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'swiper'],
  },
}

export default nextConfig