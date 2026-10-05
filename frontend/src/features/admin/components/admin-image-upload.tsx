'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { adminApi } from '@/features/admin/services/admin-api'
import { friendlyMessage } from '@/lib/api/errors'
import { resolveMediaUrl } from '@/lib/api/media'

interface AdminImageUploadProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onUploadingChange?: (uploading: boolean) => void
}

export function AdminImageUpload({
  id,
  label,
  value,
  onChange,
  onUploadingChange,
}: AdminImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('اختر ملف صورة صالحاً.')
      return
    }

    setUploading(true)
    onUploadingChange?.(true)
    try {
      onChange(await adminApi.uploadProductImage(file))
      toast.success('تم رفع الصورة')
    } catch (error) {
      toast.error(friendlyMessage(error))
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center">
        <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface sm:w-32">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveMediaUrl(value)} alt="معاينة الصورة" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted" aria-hidden="true" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void handleUpload(event)}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 sm:flex-none"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {value ? 'تغيير الصورة' : 'رفع صورة'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              aria-label="إزالة الصورة"
              disabled={uploading}
              onClick={() => onChange('')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              إزالة
            </Button>
          )}
          <p className="w-full text-xs text-muted">تظهر المعاينة هنا بعد اختيار الصورة ورفعها.</p>
        </div>
      </div>
    </div>
  )
}