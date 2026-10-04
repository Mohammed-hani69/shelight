import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { ProductGrid } from '@/components/product/product-grid'
import { EmptyState } from '@/components/common/empty-state'
import { catalogRepository } from '@/services/catalog-service'
import { productService } from '@/features/products/services/product-service'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await resolveCategory(slug)
  if (!category) return { title: 'الفئة غير موجودة' }
  return {
    title: category.name,
    description: category.description,
  }
}

async function resolveCategory(slug: string) {
  try {
    const categories = await productService.categories()
    const category = categories.find((c) => c.slug === slug)
    if (!category) return undefined
    const listed = await productService.list({ categorySlug: slug, limit: 100 })
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      products: listed.items,
    }
  } catch {
    return catalogRepository.getCategoryBySlug(slug)
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const category = await resolveCategory(slug)
  if (!category) notFound()

  return (
    <>
      <div className="relative py-12 md:py-16">
        <div className="container-shelight">
          <Breadcrumbs
            items={[{ label: 'المتجر', href: '/shop' }, { label: category.name }]}
            className="mb-4"
          />
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-plum md:text-5xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-3 text-muted">{category.description}</p>
            )}
          </div>
        </div>
      </div>

      <section className="container-shelight pb-16">
        {category.products.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-muted">
              {category.products.length} منتج{category.products.length !== 1 ? 'ات' : ''}
            </p>
            <ProductGrid products={category.products} />
          </>
        ) : (
          <EmptyState
            title="منتجات قريباً"
            description={`نعمل على تجهيز منتجات لـ ${category.name}. تصفحي باقي الفئات في هذه الأثناء.`}
            actionLabel="تصفح جميع المنتجات"
            actionHref="/shop"
          />
        )}
      </section>
    </>
  )
}