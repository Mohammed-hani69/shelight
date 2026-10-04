import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Badge } from '@/components/ui/badge'
import { journalService } from '@/features/journal/services/journal-service'

export const metadata: Metadata = {
  title: 'المدونة',
  description:
    'طقوس الجمال وعلم العناية بالبشرة وأدلة العناية بالشعر من مدونة شيلايت.',
}

/** المحتوى يُدار من لوحة التحكم — نقرؤه لكل طلب بدل تثبيته وقت البناء. */
export const dynamic = 'force-dynamic'

export default async function JournalPage() {
  const posts = await journalService.list()
  const featured = posts.find((post) => post.isFeatured) ?? posts[0]
  const rest = posts.filter((post) => post !== featured)

  return (
    <div className="container-shelight py-14 md:py-20">
      <SectionHeading
        eyebrow="المدونة"
        title="طقوس، علم وإشراقة"
        subtitle="أدلة مدعومة بالخبرات لمساعدتك في بناء طقوس ستحبينها فعلاً."
      />

      {/* المقال المميز */}
      {featured && (
        <Link
          href={`/journal/${featured.slug}`}
          className="group mb-10 grid overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface transition-shadow hover:shadow-card lg:grid-cols-2"
        >
          <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto">
            <Image
              src={featured.image}
              alt={featured.title}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="secondary">{featured.category}</Badge>
              <span className="text-xs text-muted">{featured.readTime}</span>
            </div>
            <h2 className="font-display text-3xl font-semibold leading-tight text-plum group-hover:text-primary-dark">
              {featured.title}
            </h2>
            <p className="mt-3 text-muted">{featured.excerpt}</p>
          </div>
        </Link>
      )}

      {/* باقي المقالات */}
      <div className="grid gap-6 sm:grid-cols-2">
        {rest.map((post) => (
          <Link
            key={post.slug}
            href={`/journal/${post.slug}`}
            className="group overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface transition-shadow hover:shadow-card"
          >
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src={post.image}
                alt={post.title}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="p-6">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary">{post.category}</Badge>
                <span className="text-xs text-muted">{post.readTime}</span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-plum group-hover:text-primary-dark">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{post.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}