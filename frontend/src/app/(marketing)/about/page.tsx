import type { Metadata } from 'next'
import Image from 'next/image'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'من نحن',
  description:
    'شيلايت علامة مصرية فاخرة للمستحضرات الجلدية — جمال مستوحى سريرياً لإشراقتكِ.',
  alternates: { canonical: '/about' },
}

const values = [
  {
    title: 'العلم أولاً',
    text: 'كل تركيبة مبنية على أدلة جلدية — مكونات فعّالة بنسب ذات معنى.',
  },
  {
    title: 'نتائج مرئية',
    text: 'نقيس نجاحنا بابتسامتكِ أمام المرآة — وليس بوعود التسويق.',
  },
  {
    title: 'نظيف وآمن',
    text: 'هيبوالرجينيك، خالٍ من القسوة، وتركيبات خالية من المهيّجات غير الضرورية.',
  },
  {
    title: 'فخامة للجميع',
    text: 'جودة فاخرة بأسعار عادلة، لأن البشرة المتوهجة ليست امتيازاً.',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="container-shelight py-14 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="secondary" className="mb-4">فخر مصري</Badge>
            <h1 className="font-display text-4xl font-semibold leading-tight text-plum md:text-6xl">
              جمال مستوحى من العلم. صُنع بحب.
            </h1>
            <p className="mt-5 max-w-xl leading-relaxed text-muted">
              وُلدت شيلايت من إيمان بسيط: كل امرأة تستحق عناية بالبشرة تعمل بجمال مظهرها
              وروحها. نمزج الخبرة الجلدية مع دفء الضيافة المصرية لنصنع مستحضرات جلدية تثقين
              بها — وتحبينها.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)]">
            <Image
              src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&h=675&q=70"
              alt="مختبر تصنيع شيلايت"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* القيم */}
      <section className="bg-accent/20 py-14 md:py-20" aria-label="قيمنا">
        <div className="container-shelight">
          <SectionHeading eyebrow="ما نقف عليه" title="قيمنا" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-[var(--radius-lg)] border border-border bg-surface p-6"
              >
                <h3 className="mb-2 font-display text-xl font-semibold text-plum">{value.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}