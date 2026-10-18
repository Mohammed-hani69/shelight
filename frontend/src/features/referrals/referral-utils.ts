export const REFERRAL_CODE_STORAGE_KEY = 'shelight-referral-code'

const REFERRAL_ATTRIBUTION_TTL = 30 * 24 * 60 * 60 * 1000

export function saveReferralCode(code: string): void {
  window.localStorage.setItem(
    REFERRAL_CODE_STORAGE_KEY,
    `${code}:${Date.now() + REFERRAL_ATTRIBUTION_TTL}`
  )
}

export function readReferralCode(): string | undefined {
  const saved = window.localStorage.getItem(REFERRAL_CODE_STORAGE_KEY)
  if (!saved) return undefined

  const separator = saved.lastIndexOf(':')
  const code = saved.slice(0, separator)
  const expiresAt = Number(saved.slice(separator + 1))
  if (separator < 1 || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    window.localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY)
    return undefined
  }
  return code
}
