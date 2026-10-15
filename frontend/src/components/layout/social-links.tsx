'use client'

import type { SVGProps } from 'react'
import { Facebook, Instagram } from 'lucide-react'
import { useStoreSettings } from '@/features/store-settings/use-store-settings'
import type { SocialPlatform } from '@/features/store-settings/store-settings'
import { cn } from '@/lib/utils/cn'

/**
 * أيقونات روابط التواصل الاجتماعي في الفوتر.
 *
 * الروابط تأتي من إعدادات المتجر (`socialLinks`)؛ المنصّة بلا رابط لا تُعرض.
 * تيك توك بلا أيقونة في lucide، فنستخدم مسار SVG مبسّطاً بديلاً.
 */
function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.75 4.37 1.96v3.58c-1.47-.03-2.87-.48-4.07-1.28-.42-.28-.81-.6-1.18-.94v6.6c0 1.58-.44 3.13-1.28 4.49a7.99 7.99 0 0 1-6.13 3.55c-1.62.1-3.24-.28-4.69-1.03a7.99 7.99 0 0 1-3.98-6.62 8.07 8.07 0 0 1 4.62-8.14 8.03 8.03 0 0 1 5.05-.55 1 1 0 0 1 .63 1.6v3.06a4.03 4.03 0 0 0-4.4 1.42 4.05 4.05 0 0 0 .98 5.66 4.03 4.03 0 0 0 5.9-1.29c.22-.4.34-.85.34-1.31V.02Z" />
    </svg>
  )
}

const PLATFORMS: Record<SocialPlatform, { label: string; Icon: typeof Facebook | typeof TikTokIcon }> = {
  facebook: { label: 'Facebook', Icon: Facebook },
  instagram: { label: 'Instagram', Icon: Instagram },
  tiktok: { label: 'TikTok', Icon: TikTokIcon },
}

export function SocialLinks({ className }: { className?: string }) {
  const { socialLinks } = useStoreSettings()

  const entries = (Object.keys(PLATFORMS) as SocialPlatform[])
    .map((key) => ({ key, href: socialLinks?.[key] ?? '', ...PLATFORMS[key] }))
    .filter((entry) => entry.href)

  if (entries.length === 0) return null

  return (
    <ul className={cn('flex items-center justify-center gap-2', className)}>
      {entries.map(({ key, href, label, Icon }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-primary"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  )
}
