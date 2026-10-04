import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { journalService } from '@/features/journal/services/journal-service'

interface JournalPostPageProps {
  params: Promise<{ slug: string }>
}

/** المحتوى يُدار من لوحة التحكم — نقرؤه لكل طلب بدل تثبيته وقت البناء. */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: JournalPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await journalService.getBySlug(slug)
  if (!post) return { title: 'المقال غير موجود' }
  return {
    title: post.title,
    description: post.excerpt,
  }
}

export default async function JournalPostPage({ params }: JournalPostPageProps) {
  const { slug } = await params
  const post = await journalService.getBySlug(slug)
  if (!post) notFound()

  return (
    <article className="container-shelight py-10 md:py-14">
      <Breadcrumbs items={[{ label: 'المدونة', href: '/journal' }, { label: post.title }]} className="mb-6" />

      <header className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="secondary">{post.category}</Badge>
          <span className="text-xs text-muted">
            {post.author} · {formatDate(post.publishDate)} · {post.readTime}
          </span>
        </div>
        <h1 className="font-display text-4xl font-semibold leading-tight text-plum md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted">{post.excerpt}</p>
      </header>

      <div className="relative mx-auto mt-8 aspect-[16/9] overflow-hidden rounded-[var(--radius-xl)]">
        <Image src={post.image} alt={post.title} fill sizes="100vw" className="object-cover" />
      </div>

      <div className="mx-auto mt-10 max-w-3xl space-y-6">
        {post.content.map((paragraph, i) => (
          <p key={i} className="leading-relaxed text-charcoal">
            {paragraph}
          </p>
        ))}

        <div className="rounded-[var(--radius-lg)] border border-border bg-accent/20 p-6">
          <h2 className="font-display text-xl font-semibold text-plum">نصيحة شيلايت</h2>
          <p className="mt-2 text-sm text-muted">
            الانتظام يتفوق على الشدة — روتين بسيط تتابعينه يومياً أفضل من روتين معقد تتخطينه.
          </p>
        </div>

        <Link href="/journal" className="inline-block text-sm font-medium text-primary hover:underline">
          ← العودة إلى المدونة
        </Link>
      </div>
    </article>
  )
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}