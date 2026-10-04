import { cn } from '@/lib/utils/cn'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'center' | 'start'
  /** للاستخدام على خلفية داكنة */
  tone?: 'light' | 'dark'
  className?: string
}

/** عنوان قسم موحد بنمط SHE LIGHT */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  tone = 'light',
  className,
}: SectionHeadingProps) {
  const toneClass =
    tone === 'dark'
      ? { title: 'text-cream', subtitle: 'text-cream/70', eyebrow: 'text-accent' }
      : { title: 'text-plum', subtitle: 'text-muted', eyebrow: 'text-primary' }

  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-2 md:mb-10',
        align === 'center' ? 'items-center text-center' : 'items-start text-start',
        className
      )}
    >
      {eyebrow && (
        <span className={cn('eyebrow text-xs font-medium', toneClass.eyebrow)}>
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          'font-display text-3xl font-semibold tracking-tight md:text-4xl',
          toneClass.title
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn('max-w-xl text-sm md:text-base', toneClass.subtitle)}>{subtitle}</p>
      )}
    </div>
  )
}