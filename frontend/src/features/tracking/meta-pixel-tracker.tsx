'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { initializeMetaPixel, trackMetaPixel } from '@/features/tracking/meta-pixel'

export function MetaPixelTracker() {
  const pathname = usePathname()
  const previousPathname = useRef(pathname)
  const initialPageTracked = useRef(false)

  useEffect(() => {
    initializeMetaPixel()
    if (!initialPageTracked.current) {
      initialPageTracked.current = true
      trackMetaPixel('PageView')
    }
  }, [])

  useEffect(() => {
    if (previousPathname.current === pathname) return
    previousPathname.current = pathname
    trackMetaPixel('PageView')
  }, [pathname])

  return null
}
