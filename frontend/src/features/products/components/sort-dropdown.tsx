'use client'

import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/lib/i18n/use-i18n'

export const sortOptions = [
  { value: 'popularity', label: 'mostPopular' },
  { value: 'rating', label: 'topRated' },
  { value: 'newest', label: 'newest' },
  { value: 'price-asc', label: 'priceLowToHigh' },
  { value: 'price-desc', label: 'priceHighToLow' },
] as const

export type SortValue = (typeof sortOptions)[number]['value']

interface SortDropdownProps {
  value: SortValue
  onChange: (value: SortValue) => void
}

/** قائمة الفرز */
export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const { t } = useI18n()
  const current = sortOptions.find((o) => o.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {current ? t.shop[current.label] : t.shop.sort}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className={option.value === value ? 'text-primary font-medium' : undefined}
          >
            {t.shop[option.label]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}