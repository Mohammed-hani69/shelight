/**
 * التكوين العام للتطبيق.
 * نركز كل الإعدادات في مكان واحد ليسهل تعديلها دون البحث في الكود.
 */
export const config = {
  site: {
    name: 'SHE LIGHT',
    description: 'Premium Egyptian dermocosmetics brand',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shelight-eg.com',
    currency: 'EGP',
    locale: 'ar',
    currencySymbol: 'LE',
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1',
    version: 'v1',
    timeout: 15000,
  },
  commerce: {
    freeShippingThreshold: 1500,
    shipping: 60,
  },
  pagination: {
    defaultPageSize: 12,
  },
} as const
