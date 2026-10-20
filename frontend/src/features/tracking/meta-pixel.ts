export const META_PIXEL_ID = '1646327953504209'

type MetaPixelParameterValue =
  | string
  | number
  | string[]
  | Array<{ id: string; quantity: number; item_price?: number }>
  | undefined
type MetaPixelParameters = Record<string, MetaPixelParameterValue>
type MetaPixelFunction = (
  command: 'init' | 'track',
  eventOrPixelId: string,
  parameters?: MetaPixelParameters,
  options?: { eventID: string },
) => void
type MetaPixelStub = MetaPixelFunction & {
  callMethod?: (...args: Parameters<MetaPixelFunction>) => void
  queue?: unknown[]
  push?: MetaPixelFunction
  loaded?: boolean
  version?: string
}

declare global {
  interface Window {
    fbq?: MetaPixelStub
    _fbq?: Window['fbq']
  }
}

let initialized = false

export function initializeMetaPixel(): void {
  if (typeof window === 'undefined' || initialized) return

  const existing = window.fbq
  if (existing) {
    existing('init', META_PIXEL_ID)
    initialized = true
    return
  }

  const pixel = ((...args: Parameters<MetaPixelFunction>) => {
    if (pixel.callMethod) {
      pixel.callMethod(...args)
    } else {
      pixel.queue?.push(args)
    }
  }) as MetaPixelStub
  pixel.queue = []
  pixel.push = pixel
  pixel.loaded = true
  pixel.version = '2.0'
  window.fbq = pixel
  window._fbq = pixel

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript)
  } else {
    document.head.appendChild(script)
  }

  pixel('init', META_PIXEL_ID)
  initialized = true
}

export function trackMetaPixel(
  eventName: string,
  parameters?: MetaPixelParameters,
  eventId?: string,
): void {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', eventName, parameters, eventId ? { eventID: eventId } : undefined)
}
