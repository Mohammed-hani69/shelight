'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const SPLASH_SEEN_KEY = 'shelight-splash-seen'

export function SiteSplash() {
  const [visible, setVisible] = useState(true)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SPLASH_SEEN_KEY)) {
        setVisible(false)
        return
      }
    } catch {
      // Continue with the splash if browser storage is unavailable.
    }

    const closeTimer = window.setTimeout(() => {
      setClosing(true)
      try {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, 'true')
      } catch {
        // The screen still closes even when browser storage is unavailable.
      }
      window.setTimeout(() => setVisible(false), 350)
    }, 1100)

    return () => window.clearTimeout(closeTimer)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    setClosing(true)
    try {
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, 'true')
    } catch {
      // Dismissing the splash does not depend on browser storage.
    }
    window.setTimeout(() => setVisible(false), 250)
  }

  return (
    <div
      role="status"
      aria-label="جارٍ تحميل SHE LIGHT"
      className={`fixed inset-0 z-[100] flex min-h-[100svh] items-center justify-center bg-cream px-6 transition-opacity duration-300 ${
        closing ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <Image
          src="/images/logo.png"
          alt="SHE LIGHT"
          width={640}
          height={424}
          priority
          className="site-splash-mark h-auto w-52 object-contain sm:w-60"
        />
        <p className="mt-2 font-display text-base font-medium text-plum sm:text-lg">
          جمالك يبدأ من هنا
        </p>
        <div className="mt-8 h-1 w-36 overflow-hidden rounded-full bg-border" aria-hidden="true">
          <span className="site-splash-progress block h-full w-full origin-right rounded-full bg-primary" />
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 min-h-11 px-4 text-sm text-muted transition-colors hover:text-plum"
        >
          تخطي
        </button>
      </div>
    </div>
  )
}
