'use client'

import { useEffect, useRef, useState } from 'react'
import { Info, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ProfileAvatar } from '@/components/client/profile-avatar'

interface ScoringAnchor {
  score: number
  gender: string
  description: string
  image_url: string | null
}

interface AppearanceScoreFieldProps {
  value: string
  onChange: (v: string) => void
  profileName: string
  avatarUrl?: string | null
  gender: 'male' | 'female'
}

const SCORE_OPTIONS = [5.0, 6.0, 6.5, 7.0, 8.0, 9.0]

export function AppearanceScoreField({
  value,
  onChange,
  profileName,
  avatarUrl,
  gender,
}: AppearanceScoreFieldProps) {
  const [open, setOpen] = useState(false)
  const [anchors, setAnchors] = useState<ScoringAnchor[]>([])
  const [loadingAnchors, setLoadingAnchors] = useState(false)
  const [uploadingScore, setUploadingScore] = useState<number | null>(null)
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const popoverRef = useRef<HTMLDivElement | null>(null)

  // 点外面关闭
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function loadAnchors() {
    if (anchors.length > 0) return
    setLoadingAnchors(true)
    try {
      const res = await fetch(`/api/scoring-anchors?gender=${gender}`)
      const data = await res.json()
      if (data.success) setAnchors(data.anchors)
    } finally {
      setLoadingAnchors(false)
    }
  }

  function handleToggle() {
    if (!open) loadAnchors()
    setOpen((v) => !v)
  }

  async function uploadAnchorImage(score: number, file: File) {
    setUploadingScore(score)
    try {
      const body = new FormData()
      body.set('score', String(score))
      body.set('gender', gender)
      body.set('file', file)
      const res = await fetch('/api/scoring-anchors', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || '上传失败')
      setAnchors((prev) =>
        prev.map((a) =>
          a.score === score && a.gender === gender ? { ...a, image_url: data.imageUrl } : a
        )
      )
      toast.success(`${score} 分参考图已更新`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploadingScore(null)
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground/70">颜值评分 (1–10)</label>

      {/* 主区域：头像 + input + ℹ */}
      <div className="flex items-center gap-3">
        <ProfileAvatar
          name={profileName}
          avatarUrl={avatarUrl}
          className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-[color:var(--surface-soft-strong)] shadow-sm"
          imageClassName="h-full w-full object-cover"
          iconClassName="h-5 w-5 text-primary/60"
        />

        <input
          type="number"
          min={1}
          max={10}
          step={0.5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.0"
          className="h-10 w-24 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* ℹ 锚点按钮 */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={handleToggle}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="查看颜值评分参考标准"
          >
            <Info className="h-4 w-4" />
          </button>

          {open && (
            <div className="absolute left-1/2 top-10 z-50 w-[340px] -translate-x-1/2 rounded-2xl border border-border/80 bg-white shadow-[0_16px_48px_-16px_rgba(15,23,42,0.18)] dark:bg-[rgba(18,25,38,0.98)]">
              <div className="border-b border-border/60 px-4 py-3">
                <p className="text-sm font-semibold">颜值评分参考标准</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {gender === 'female' ? '女方' : '男方'}参考 · 点击上传更换示例图
                </p>
              </div>

              <div className="max-h-[420px] overflow-y-auto p-3 space-y-2">
                {loadingAnchors ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  SCORE_OPTIONS.map((score) => {
                    const anchor = anchors.find((a) => Number(a.score) === score)
                    const isUploading = uploadingScore === score
                    return (
                      <div
                        key={score}
                        className="flex items-center gap-3 rounded-xl border border-border/50 bg-[color:var(--surface-soft)] p-2.5"
                      >
                        {/* 分值 */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-sm font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                          {score}
                        </div>

                        {/* 描述 */}
                        <p className="flex-1 text-xs text-foreground/80 leading-relaxed">
                          {anchor?.description ?? ''}
                        </p>

                        {/* 示例图 + 上传 */}
                        <div className="relative shrink-0">
                          {anchor?.image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={anchor.image_url}
                              alt={`${score}分示例`}
                              className="h-12 w-12 rounded-lg object-cover border border-border/50"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg border border-dashed border-border/60 bg-white/60 dark:bg-white/5" />
                          )}
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRefs.current[score]?.click()}
                            className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                            aria-label={`上传 ${score} 分示例图`}
                          >
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                            ) : (
                              <Upload className="h-4 w-4 text-white" />
                            )}
                          </button>
                          <input
                            ref={(el) => { fileInputRefs.current[score] = el }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) uploadAnchorImage(score, file)
                              e.target.value = ''
                            }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
