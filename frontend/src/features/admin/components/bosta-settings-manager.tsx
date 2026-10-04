'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminApi } from '@/features/admin/services/admin-api'

interface BostaFormState {
  enabled: boolean
  environment: 'sandbox' | 'production'
  apiKey: string
  clientId: string
  secret: string
  defaultPickupLocation: string
  defaultDeliveryType: string
  defaultPackageType: string
  defaultShippingFee: string
}

const emptyForm: BostaFormState = {
  enabled: false,
  environment: 'sandbox',
  apiKey: '',
  clientId: '',
  secret: '',
  defaultPickupLocation: '',
  defaultDeliveryType: '',
  defaultPackageType: '',
  defaultShippingFee: '0',
}

export function BostaSettingsManager() {
  const [form, setForm] = useState<BostaFormState>(emptyForm)
  const [masking, setMasking] = useState({ apiKeyMasked: '', clientIdMasked: '', secretMasked: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = (await adminApi.getBostaSettings()) as Record<string, unknown> & {
        enabled?: boolean
        environment?: 'sandbox' | 'production'
        apiKeyMasked?: string
        clientIdMasked?: string
        secretMasked?: string
      }
      setForm({
        enabled: Boolean(data.enabled),
        environment: data.environment === 'production' ? 'production' : 'sandbox',
        apiKey: '',
        clientId: '',
        secret: '',
        defaultPickupLocation: String(data.defaultPickupLocation ?? ''),
        defaultDeliveryType: String(data.defaultDeliveryType ?? ''),
        defaultPackageType: String(data.defaultPackageType ?? ''),
        defaultShippingFee: String(data.defaultShippingFee ?? '0'),
      })
      setMasking({
        apiKeyMasked: String(data.apiKeyMasked ?? ''),
        clientIdMasked: String(data.clientIdMasked ?? ''),
        secretMasked: String(data.secretMasked ?? ''),
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذّر تحميل إعدادات Bosta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const updateField = (field: keyof BostaFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      await adminApi.saveBostaSettings({
        enabled: form.enabled,
        environment: form.environment,
        apiKey: form.apiKey || undefined,
        clientId: form.clientId || undefined,
        secret: form.secret || undefined,
        defaultPickupLocation: form.defaultPickupLocation || undefined,
        defaultDeliveryType: form.defaultDeliveryType || undefined,
        defaultPackageType: form.defaultPackageType || undefined,
        defaultShippingFee: Number(form.defaultShippingFee || 0),
      })
      toast.success('تم حفظ إعدادات Bosta بنجاح')
      await loadSettings()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذّر حفظ إعدادات Bosta')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    try {
      setTesting(true)
      const result = (await adminApi.testBostaConnection({
        apiKey: form.apiKey || undefined,
        clientId: form.clientId || undefined,
        secret: form.secret || undefined,
        environment: form.environment,
      })) as Record<string, unknown>
      const ok = Boolean(result.ok)
      toast[ok ? 'success' : 'error'](
        ok
          ? '✓ Bosta connection successful'
          : `✕ ${String(result.message ?? 'Unable to connect to Bosta')}`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to connect to Bosta')
    } finally {
      setTesting(false)
    }
  }

  const toggleIntegration = async (nextValue: boolean) => {
    try {
      const result = nextValue
        ? await adminApi.enableBostaIntegration()
        : await adminApi.disableBostaIntegration()
      setForm((prev) => ({ ...prev, enabled: nextValue }))
      toast.success(nextValue ? 'تم تفعيل Bosta' : 'تم إيقاف Bosta')
      console.info('Bosta toggle result', result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذّر تحديث حالة Bosta')
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">جاري تحميل إعدادات Bosta…</div>
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">Bosta Integration</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-plum">إعدادات الشحن</h2>
        </div>
        <label className="inline-flex items-center gap-3 rounded-full border border-border bg-background px-3 py-2 text-sm">
          <span>Enable Bosta Integration</span>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => {
              const value = event.target.checked
              setForm((prev) => ({ ...prev, enabled: value }))
              void toggleIntegration(value)
            }}
            className="h-4 w-4 accent-plum"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-charcoal">Environment</span>
          <select
            value={form.environment}
            onChange={(event) => updateField('environment', event.target.value as 'sandbox' | 'production')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0"
          >
            <option value="sandbox">Sandbox / Test</option>
            <option value="production">Production</option>
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-charcoal">Default pickup location</span>
          <input
            value={form.defaultPickupLocation}
            onChange={(event) => updateField('defaultPickupLocation', event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder="Cairo, Egypt"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-charcoal">Default delivery type</span>
          <input
            value={form.defaultDeliveryType}
            onChange={(event) => updateField('defaultDeliveryType', event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder="standard"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-charcoal">Default package type</span>
          <input
            value={form.defaultPackageType}
            onChange={(event) => updateField('defaultPackageType', event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder="box"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-charcoal">Default shipping fee</span>
          <input
            value={form.defaultShippingFee}
            onChange={(event) => updateField('defaultShippingFee', event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder="0"
            type="number"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-charcoal">API Key</span>
          <input
            type="password"
            value={form.apiKey}
            onChange={(event) => updateField('apiKey', event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder={masking.apiKeyMasked || 'Enter API key'}
          />
          {masking.apiKeyMasked ? <p className="text-xs text-muted">Current: {masking.apiKeyMasked}</p> : null}
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-charcoal">Account ID / Client ID</span>
          <input
            type="password"
            value={form.clientId}
            onChange={(event) => updateField('clientId', event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder={masking.clientIdMasked || 'Enter client id'}
          />
          {masking.clientIdMasked ? <p className="text-xs text-muted">Current: {masking.clientIdMasked}</p> : null}
        </label>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="text-charcoal">Secret</span>
          <input
            type="password"
            value={form.secret}
            onChange={(event) => updateField('secret', event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder={masking.secretMasked || 'Enter secret'}
          />
          {masking.secretMasked ? <p className="text-xs text-muted">Current: {masking.secretMasked}</p> : null}
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="rounded-lg bg-plum px-4 py-2 text-sm font-medium text-cream transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-charcoal transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </div>
  )
}
