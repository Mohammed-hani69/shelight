import type { MetadataRoute } from 'next'
import { config } from '@/config/site'
import { journalService } from '@/features/journal/services/journal-service'
import { productService } from '@/features/products/services/product-service'
import { resolveMediaUrl } from '@/lib/api/media'

export const dynamic = 'force-dynamic'

function escapeXmlUrl(url: string): string {
  return url.replace(/&/g, '&amp;')
}

async function getAllProducts() {
  const firstPage = await productService.list({ limit: 100 })
  const products = [...firstPage.items]

  while (products.length < firstPage.total) {
    const nextPage = await productService.list({ limit: 100, offset: products.length })
    if (nextPage.items.length === 0) break
    products.push(...nextPage.items)
  }

  return products
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productsResult, categoriesResult, articlesResult] = await Promise.allSettled([
    getAllProducts(),
    productService.categories(),
    journalService.list(),
  ])
  const products = productsResult.status === 'fulfilled' ? productsResult.value : []
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
  const articles = articlesResult.status === 'fulfilled' ? articlesResult.value : []
  const staticPaths = ['', '/shop', '/about', '/contact', '/journal']

  return [
    ...staticPaths.map((path) => ({ url: new URL(path, config.site.url).toString() })),
    ...categories.map((category) => ({
      url: new URL(`/categories/${category.slug}`, config.site.url).toString(),
    })),
    ...products.map((product) => ({
      url: new URL(`/products/${product.slug}`, config.site.url).toString(),
      images: product.images.map((image) => escapeXmlUrl(resolveMediaUrl(image.url))),
    })),
    ...articles.map((article) => ({
      url: new URL(`/journal/${article.slug}`, config.site.url).toString(),
      images: [
        escapeXmlUrl(
          article.image.startsWith('/uploads/')
            ? resolveMediaUrl(article.image)
            : new URL(article.image, config.site.url).toString(),
        ),
      ],
    })),
  ]
}