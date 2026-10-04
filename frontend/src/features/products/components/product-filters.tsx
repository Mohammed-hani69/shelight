'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import type { Category } from '@/types/product'
import { SlidersHorizontal } from 'lucide-react'
import { useI18n } from '@/lib/i18n/use-i18n'

export interface FilterValues {
  categories: string[]
  tags: string[]
  minPrice?: number
  maxPrice?: number
}

export const tagOptions = [
  { value: 'serum', label: 'serums' },
  { value: 'cleanser', label: 'cleansers' },
  { value: 'moisturizer', label: 'moisturizers' },
  { value: 'hair', label: 'hairCare' },
  { value: 'eye', label: 'eyeCare' },
  { value: 'sensitive', label: 'sensitiveSkin' },
  { value: 'glow', label: 'brightening' },
] as const

interface FilterPanelProps {
  categories: Category[]
  values: FilterValues
  onChange: (values: FilterValues) => void
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/** لوحة الفلاتر — أساس مشترك لسايدبار الديسكتوب ودرج الموبايل */
export function FilterPanel({ categories, values, onChange }: FilterPanelProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-plum">{t.shop.category}</h3>
        <div className="space-y-2.5">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${category.slug}`}
                checked={values.categories.includes(category.slug)}
                onCheckedChange={() =>
                  onChange({ ...values, categories: toggle(values.categories, category.slug) })
                }
              />
              <Label htmlFor={`cat-${category.slug}`} className="text-sm font-normal text-charcoal">
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-plum">{t.shop.productType}</h3>
        <div className="space-y-2.5">
          {tagOptions.map((tag) => (
            <div key={tag.value} className="flex items-center gap-2">
              <Checkbox
                id={`tag-${tag.value}`}
                checked={values.tags.includes(tag.value)}
                onCheckedChange={() =>
                  onChange({ ...values, tags: toggle(values.tags, tag.value) })
                }
              />
              <Label htmlFor={`tag-${tag.value}`} className="text-sm font-normal text-charcoal">
                {t.shop.tags[tag.label]}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface FilterDrawerProps {
  categories: Category[]
  values: FilterValues
  onChange: (values: FilterValues) => void
}

/** درج الفلاتر للموبايل */
export function FilterDrawer({ categories, values, onChange }: FilterDrawerProps) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.shop.filters}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <FilterPanel categories={categories} values={values} onChange={onChange} />
        </div>
        <Button className="mt-8 w-full" onClick={() => setOpen(false)}>
          {t.shop.showResults}
        </Button>
      </SheetContent>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="lg:hidden"
        aria-label={t.shop.openFilters}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        {t.shop.filters}
      </Button>
    </Sheet>
  )
}