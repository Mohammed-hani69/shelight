import type { Metadata } from 'next'
import { MapPin, Mail, Phone, Clock } from 'lucide-react'
import { SectionHeading } from '@/components/marketing/section-heading'

export const metadata: Metadata = {
  title: 'تواصل معنا',
  description: 'تواصلي مع فريق شيلايت — نحن هنا لمساعدتك في الطلبات والمنتجات وكل ما يخص الإشراقة.',
  alternates: { canonical: '/contact' },
}

const channels = [
  { Icon: Phone, title: 'اتصلي بنا', text: '+20 100 000 0000', sub: 'الأحد–الخميس، 10ص–8م' },
  { Icon: Mail, title: 'البريد الإلكتروني', text: 'hello@shelight.eg', sub: 'نرد خلال 24 ساعة' },
  { Icon: MapPin, title: 'زورينا', text: 'القاهرة، مصر', sub: 'صالة العرض بموعد مسبق' },
  { Icon: Clock, title: 'ساعات الدعم', text: '10ص – 8م', sub: 'طوال أيام الأسبوع' },
]

export default function ContactPage() {
  return (
    <div className="container-shelight py-14 md:py-20">
      <SectionHeading
        eyebrow="نحن هنا من أجلك"
        title="تواصلي مع شيلايت"
        subtitle="أسئلة عن طلب أو روتين أو استرداد؟ فريقنا يرد خلال 24 ساعة."
      />

      <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
        {channels.map(({ Icon, title, text, sub }) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-plum">{title}</h2>
              <p className="mt-0.5 text-sm font-medium text-charcoal">{text}</p>
              <p className="text-xs text-muted">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}