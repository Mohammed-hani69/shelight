import Image, { type ImageProps } from 'next/image'
import { resolveMediaUrl } from '@/lib/api/media'

export function MediaImage({ src, ...props }: ImageProps) {
  const resolvedSrc = typeof src === 'string' ? resolveMediaUrl(src) : src
  return <Image src={resolvedSrc} {...props} />
}
