'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_STORE_SETTINGS,
  fetchStoreSettings,
  type StoreSettings,
} from '@/features/store-settings/store-settings'

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS)

  useEffect(() => {
    let active = true
    fetchStoreSettings()
      .then((value) => {
        if (active) setSettings({ ...DEFAULT_STORE_SETTINGS, ...value })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return settings
}