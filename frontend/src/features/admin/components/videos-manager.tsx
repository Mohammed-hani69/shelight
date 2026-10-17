'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorState } from '@/features/admin/components/error-state'
import {
  EMPTY_VIDEO_SECTION,
  videosService,
  type StorefrontVideo,
  type VideoSection,
} from '@/features/videos/videos-service'
import { friendlyMessage } from '@/lib/api/errors'
import { resolveMediaUrl } from '@/lib/api/media'
import { cn } from '@/lib/utils/cn'

export function VideosManager() {
  const [section, setSection] = useState<VideoSection>(EMPTY_VIDEO_SECTION)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    let active = true
    videosService
      .getAdminSection()
      .then((saved) => {
        if (active) setSection({ ...EMPTY_VIDEO_SECTION, ...saved })
      })
      .catch((cause) => {
        if (active) setError(friendlyMessage(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const updateVideo = (index: number, changes: Partial<StorefrontVideo>) => {
    setSection((current) => ({
      ...current,
      videos: current.videos.map((video, itemIndex) =>
        itemIndex === index ? { ...video, ...changes } : video
      ),
    }))
  }

  const uploadVideo = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['video/mp4', 'video/webm'].includes(file.type)) {
      toast.error('اختر فيديو بصيغة MP4 أو WebM.')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('حجم الفيديو يجب ألا يتجاوز 100 ميجابايت.')
      return
    }
    setUploadingIndex(index)
    try {
      const url = await videosService.uploadVideo(file)
      updateVideo(index, {
        url,
        title: section.videos[index]?.title || file.name.replace(/\.[^.]+$/, ''),
      })
      toast.success('تم رفع الفيديو')
    } catch (cause) {
      toast.error(friendlyMessage(cause))
    } finally {
      setUploadingIndex(null)
    }
  }

  const moveVideo = (index: number, direction: -1 | 1) => {
    setSection((current) => {
      const target = index + direction
      if (target < 0 || target >= current.videos.length) return current
      const videos = [...current.videos]
      ;[videos[index], videos[target]] = [videos[target], videos[index]]
      return { ...current, videos }
    })
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (section.videos.some((video) => !video.url)) {
      toast.error('ارفعي كل الفيديوهات المضافة قبل الحفظ.')
      return
    }
    setSaving(true)
    try {
      const saved = await videosService.saveAdminSection(section)
      setSection(saved)
      toast.success('تم حفظ إعدادات سكشن الفيديوهات')
    } catch (cause) {
      toast.error(friendlyMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted">جارٍ تحميل إعدادات الفيديوهات…</p>

  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      <form onSubmit={save} className="space-y-5">
        <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-plum">سكشن الصفحة الرئيسية</h2>
              <p className="mt-1 text-sm text-muted">تظهر الفيديوهات بالتتابع، وتعمل تلقائيًا دون صوت.</p>
            </div>
            <button
              type="button"
              aria-pressed={section.isActive}
              onClick={() => setSection((current) => ({ ...current, isActive: !current.isActive }))}
              className={cn(
                'inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium',
                section.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground',
              )}
            >
              {section.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {section.isActive ? 'السكشن ظاهر' : 'السكشن مخفي'}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="videos-title">عنوان السكشن</Label>
              <Input id="videos-title" maxLength={160} value={section.title} onChange={(event) => setSection((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="videos-description">وصف السكشن</Label>
              <Input id="videos-description" maxLength={500} value={section.description} onChange={(event) => setSection((current) => ({ ...current, description: event.target.value }))} />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-plum">فيديوهات السكشن</h2>
              <p className="mt-1 text-sm text-muted">الصيغ المدعومة MP4 وWebM، بحد أقصى 100 ميجابايت للفيديو.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={section.videos.length >= 30 || uploadingIndex !== null}
              onClick={() => setSection((current) => ({
                ...current,
                videos: [...current.videos, { title: '', url: '' }],
              }))}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              إضافة فيديو
            </Button>
          </div>

          {section.videos.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              لم تتم إضافة فيديوهات بعد.
            </p>
          )}

          {section.videos.map((video, index) => (
            <article key={`${video.url}-${index}`} className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-[140px_1fr]">
              <div className="aspect-[9/16] max-h-56 overflow-hidden rounded-md bg-charcoal">
                {video.url ? (
                  <video
                    src={resolveMediaUrl(video.url)}
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-white/70">لا يوجد فيديو</div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-charcoal">فيديو {index + 1}</h3>
                  <div className="flex items-center">
                    <Button type="button" variant="ghost" size="icon" aria-label="تحريك لأعلى" disabled={uploadingIndex !== null || index === 0} onClick={() => moveVideo(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="تحريك لأسفل" disabled={uploadingIndex !== null || index === section.videos.length - 1} onClick={() => moveVideo(index, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`حذف فيديو ${index + 1}`} disabled={uploadingIndex !== null} onClick={() => setSection((current) => ({ ...current, videos: current.videos.filter((_, itemIndex) => itemIndex !== index) }))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`video-title-${index}`}>اسم الفيديو</Label>
                  <Input id={`video-title-${index}`} required maxLength={160} value={video.title} onChange={(event) => updateVideo(index, { title: event.target.value })} />
                </div>
                <input
                  ref={(element) => { fileInputs.current[index] = element }}
                  type="file"
                  accept="video/mp4,video/webm"
                  className="sr-only"
                  onChange={(event) => void uploadVideo(index, event)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingIndex !== null}
                  onClick={() => fileInputs.current[index]?.click()}
                >
                  {uploadingIndex === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {video.url ? 'استبدال الفيديو' : 'رفع فيديو'}
                </Button>
              </div>
            </article>
          ))}
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || uploadingIndex !== null} className="min-h-11 w-full sm:w-auto">
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'جارٍ الحفظ…' : 'حفظ سكشن الفيديوهات'}
          </Button>
        </div>
      </form>
    </div>
  )
}
