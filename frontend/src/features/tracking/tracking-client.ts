import { config } from '@/config/site'
import { getAuthToken } from '@/lib/api/client'

/**
 * عميل تتبّع رحلة العميل (First-Party).
 *
 * - معرّف زائر مجهول (UUID) في localStorage ويرسل في ترويسة `X-Anonymous-Id`.
 * - معرّف جلسة في sessionStorage.
 * - الأحداث تُجمَّع في دفعات وتُرسل دورياً، وتُفرَّغ عند إخفاء الصفحة.
 * - كل حدث يحمل `eventId` فريداً لمنع التكرار عند الإعادة.
 */

const ANON_KEY = 'shelight-anon-id'
const SESSION_KEY = 'shelight-session-id'
const CHECKOUT_KEY = 'shelight-checkout-key'

const BATCH_SIZE = 20
const MAX_BATCH = 50
const MAX_QUEUE = 200
const FLUSH_INTERVAL_MS = 5000

export type TrackingProperties = Record<string, unknown>

/** هوية العميل المحتمل أثناء الدفع — بلا بريد إلكتروني. */
export interface CheckoutLeadPayload {
  checkoutKey?: string
  sessionId?: string
  fullName?: string
  primaryPhone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  governorate?: string
}

interface QueuedEvent {
  eventId: string
  name: string
  sessionId: string | null
  timestamp: string
  pageUrl: string | null
  referrer: string | null
  path: string | null
  properties: TrackingProperties
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function trackingEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true' &&
    process.env.NEXT_PUBLIC_TRACKING_ENABLED !== 'false'
  )
}

function readStore(kind: 'local' | 'session', key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage
    return store.getItem(key)
  } catch {
    return null
  }
}

function writeStore(kind: 'local' | 'session', key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage
    if (value) store.setItem(key, value)
    else store.removeItem(key)
  } catch {
    // التخزين قد يكون معطّلاً (وضع خاص) — نتجاهل بصمت.
  }
}

class TrackingClient {
  private enabled = false
  private initialized = false
  private anonId: string | null = null
  private sessionId: string | null = null
  private queue: QueuedEvent[] = []
  private timer: ReturnType<typeof setInterval> | null = null

  /** يهيّئ العميل مرة واحدة على المتصفح — آمن للاستدعاء المتكرر. */
  init(): void {
    if (typeof window === 'undefined' || this.initialized) return
    this.initialized = true
    this.enabled = trackingEnabled()
    if (!this.enabled) return

    this.anonId = readStore('local', ANON_KEY) ?? uuid()
    writeStore('local', ANON_KEY, this.anonId)
    this.sessionId = readStore('session', SESSION_KEY) ?? uuid()
    writeStore('session', SESSION_KEY, this.sessionId)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.flush(true)
    })
    window.addEventListener('pagehide', () => void this.flush(true))
    this.timer = setInterval(() => void this.flush(false), FLUSH_INTERVAL_MS)
  }

  get anonymousId(): string | null {
    return this.anonId
  }

  get currentSessionId(): string | null {
    return this.sessionId
  }

  /** معرّف جلسة الدفع — ثابت خلال نفس جلسة المتصفح. */
  checkoutKey(): string {
    const existing = readStore('session', CHECKOUT_KEY)
    if (existing) return existing
    const key = uuid()
    writeStore('session', CHECKOUT_KEY, key)
    return key
  }

  /** يسجّل حدثاً في الدفعة، ويفرّغها فوراً عند بلوغ حجمها. */
  track(name: string, properties: TrackingProperties = {}): void {
    if (typeof window === 'undefined' || !this.enabled) return
    if (this.queue.length >= MAX_QUEUE) this.queue.shift()
    this.queue.push({
      eventId: uuid(),
      name,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      referrer: document.referrer || null,
      path: window.location.pathname,
      properties,
    })
    if (this.queue.length >= BATCH_SIZE) void this.flush(false)
  }

  /** يربط الزائر المجهول بالحساب الحالي بعد تسجيل الدخول/إنشاء الحساب. */
  async identify(): Promise<void> {
    if (!this.enabled || !this.anonId) return
    try {
      await fetch(`${config.api.baseUrl}/tracking/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader() },
        body: JSON.stringify({ anonymousId: this.anonId }),
        keepalive: true,
      })
    } catch {
      // الربط اختياري — الفشل لا يؤثر على تجربة المستخدم.
    }
  }

  /**
   * يحفظ هوية العميل المحتمل تدريجياً أثناء الدفع (فوري بلا تجميع).
   * يُستدعى عند الكتابة (debounce) وعند مغادرة الحقل (onBlur)، فلا تنتظر
   * حتى إتمام الطلب. الفشل لا يعطّل الدفع.
   */
  async saveCheckoutLead(payload: CheckoutLeadPayload): Promise<void> {
    if (typeof window === 'undefined' || !this.enabled) return
    try {
      await fetch(`${config.api.baseUrl}/tracking/checkout-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeader(),
          ...(this.anonId ? { 'X-Anonymous-Id': this.anonId } : {}),
        },
        body: JSON.stringify({ anonymousId: this.anonId, ...payload }),
        keepalive: true,
      })
    } catch {
      // الحفظ التدريجي اختياري — نتجاهل الفشل بصمت.
    }
  }

  /** يرسل الدفعة الحالية. `keepAlive` عند مغادرة الصفحة. */
  async flush(keepAlive = false): Promise<void> {
    if (!this.enabled || this.queue.length === 0) return
    const batch = this.queue.slice(0, MAX_BATCH)
    const sentIds = new Set(batch.map((event) => event.eventId))
    const body = JSON.stringify({ events: batch, anonymousId: this.anonId })
    try {
      const response = await fetch(`${config.api.baseUrl}/tracking/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader() },
        body,
        keepalive: keepAlive,
      })
      if (response.ok) {
        // نزيل فقط ما أُرسل فعلاً — يمنع فقد أحداث عند تزامن تفريغين.
        this.queue = this.queue.filter((event) => !sentIds.has(event.eventId))
      }
    } catch {
      // نبقي الأحداث في الطابور لإعادة الإرسال في الدفعة التالية.
    }
  }

  /** يبدّل الهوية عند تسجيل الخروج حتى لا تُخلط رحلات شخصين. */
  reset(): void {
    if (typeof window === 'undefined') return
    this.anonId = uuid()
    writeStore('local', ANON_KEY, this.anonId)
    this.sessionId = uuid()
    writeStore('session', SESSION_KEY, this.sessionId)
    writeStore('session', CHECKOUT_KEY, '')
    this.queue = []
  }

  private authHeader(): Record<string, string> {
    const token = getAuthToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
}

export const trackingClient = new TrackingClient()
