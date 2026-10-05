'use client'

import { MessageCircle } from 'lucide-react'
import { useStoreSettings } from '@/features/store-settings/use-store-settings'

export function WhatsAppFloat() {
  const { whatsappPhone } = useStoreSettings()
  const phone = whatsappPhone.replace(/\D/g, '')
  if (!phone) return null

  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      title="واتساب"
      className="fixed bottom-[calc(var(--app-bar-height)+1.5rem)] end-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 lg:bottom-6"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  )
}