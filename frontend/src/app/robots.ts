import type { MetadataRoute } from 'next'
import { config } from '@/config/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/cart', '/checkout', '/wishlist', '/login', '/register'],
    },
    sitemap: new URL('/sitemap.xml', config.site.url).toString(),
  }
}