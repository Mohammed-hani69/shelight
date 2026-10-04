import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { ProductGallery } from '@/components/product/product-gallery'
import { ProductCarousel } from '@/components/product/product-carousel'
import { BuyBox } from '@/features/products/components/buy-box'
import { ProductTabs } from '@/features/products/components/product-tabs'
import { ReviewsSection } from '@/features/reviews/components/reviews-section'
import { StickyCartBar } from '@/features/products/components/sticky-cart-bar'
import { ProductViewTracker } from '@/features/tracking/product-view-tracker'
import { SectionHeading } from '@/components/marketing/section-heading'
import { productService } from '@/features/products/services/product-service'
import { config } from '@/config/site'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await productService.getBySlug(slug)
  if (!product) return { title: 'المنتج غير موجود' }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: `${product.name} — SHE LIGHT`,
      description: product.description,
      images: product.images[0] ? [{ url: product.images[0].url }] : [],
      type: 'website',
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await productService.getBySlug(slug)
  if (!product) notFound()

  const related = await productService.related(product)

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    brand: { '@type': 'Brand', name: config.site.name },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'EGP',
      availability: product.inventoryStatus === 'out-of-stock'
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
  }

  // حشوة إضافية: شريط الشراء الثابت يطفو فوق المحتوى في الموبايل،
  // فالمسافة يجب أن تغطيه هو إضافةً إلى حشوة شريط الموبايل في التخطيط.
  return (
    <div className="pb-[4.5rem] md:pb-0">
      <ProductViewTracker
        productId={product.id}
        slug={product.slug}
        name={product.name}
        price={product.price}
      />
      <div className="container-shelight py-6">
        <Breadcrumbs
          items={[
            { label: 'المتجر', href: '/shop' },
            { label: product.category.name, href: `/categories/${product.category.slug}` },
            { label: product.name },
          ]}
        />
      </div>

      <section className="container-shelight pb-6 md:pb-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery images={product.images} />
          <BuyBox product={product} />
        </div>
      </section>

      <section className="container-shelight pb-10">
        <ProductTabs product={product} />
      </section>

      <section className="container-shelight pb-10">
        <ReviewsSection productId={product.id} productName={product.name} product={product} />
      </section>

      {related.length > 0 && (
        <section className="container-shelight pb-16" aria-label="منتجات ذات صلة">
          <SectionHeading eyebrow="أكملي الروتين" title="قد يعجبك أيضاً" align="start" />
          <ProductCarousel products={related} />
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <StickyCartBar product={product} />
    </div>
  )
}