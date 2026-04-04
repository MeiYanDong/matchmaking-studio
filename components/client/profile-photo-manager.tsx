'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Camera, ImagePlus, Loader2 } from 'lucide-react'
import { ProfileAvatar } from '@/components/client/profile-avatar'

interface ProfilePhotoManagerProps {
  profileId: string
  name: string
  avatarUrl?: string | null
  lifestylePhotoUrls?: string[] | null
}

export function ProfilePhotoManager({
  profileId,
  name,
  avatarUrl,
  lifestylePhotoUrls,
}: ProfilePhotoManagerProps) {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const lifestyleInputRef = useRef<HTMLInputElement | null>(null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl ?? null)
  const [currentLifestylePhotoUrls, setCurrentLifestylePhotoUrls] = useState(lifestylePhotoUrls ?? [])
  const [uploadingKind, setUploadingKind] = useState<'avatar' | 'lifestyle' | null>(null)

  async function uploadFiles(kind: 'avatar' | 'lifestyle', files: FileList | null) {
    if (!files?.length) return

    setUploadingKind(kind)

    try {
      for (const file of Array.from(files)) {
        const body = new FormData()
        body.set('profileId', profileId)
        body.set('kind', kind)
        body.set('file', file)

        const response = await fetch('/api/profile-photos', {
          method: 'POST',
          body,
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || '上传失败')
        }

        if (kind === 'avatar') {
          setCurrentAvatarUrl(payload.photoUrl)
        } else {
          if (Array.isArray(payload.lifestylePhotoUrls)) {
            setCurrentLifestylePhotoUrls(payload.lifestylePhotoUrls)
          } else {
            setCurrentLifestylePhotoUrls((previous) => [...previous, payload.photoUrl])
          }
        }
      }

      toast.success(kind === 'avatar' ? '头像已更新' : '生活照已上传')
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败'
      toast.error(message)
    } finally {
      setUploadingKind(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      if (lifestyleInputRef.current) lifestyleInputRef.current.value = ''
    }
  }

  return (
    <section className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,253,0.94))] p-4 shadow-[0_22px_48px_-40px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,21,32,0.94),rgba(10,15,22,0.96))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.64)] md:p-5">
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm text-foreground/85">头像</Label>
            <p className="text-xs leading-5 text-muted-foreground">
              头像只用于客户识别，会显示在客户列表和详情页头部。
            </p>
          </div>

          <div className="flex items-center gap-4">
            <ProfileAvatar
              name={name}
              avatarUrl={currentAvatarUrl}
              className="h-24 w-24 overflow-hidden rounded-[24px] border border-border/80 bg-white shadow-[0_16px_34px_-22px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(17,24,37,0.98),rgba(10,15,22,0.98))] dark:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.62)]"
              imageClassName="h-full w-full object-cover"
              iconClassName="h-8 w-8 text-primary/70"
              fallbackLabel="未上传头像"
            />

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="bg-white/85 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:hover:bg-white/[0.08]"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingKind !== null}
              >
                {uploadingKind === 'avatar' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                上传头像
              </Button>
              <p className="text-xs text-muted-foreground">建议上传清晰正脸图，方便红娘一眼识别。</p>
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => uploadFiles('avatar', event.target.files)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-sm text-foreground/85">生活照</Label>
              <p className="text-xs leading-5 text-muted-foreground">
                生活照用于补充资料展示，不会自动拿来顶替头像。
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="bg-white/85 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:hover:bg-white/[0.08]"
              onClick={() => lifestyleInputRef.current?.click()}
              disabled={uploadingKind !== null}
            >
              {uploadingKind === 'lifestyle' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              上传生活照
            </Button>
          </div>

          <input
            ref={lifestyleInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => uploadFiles('lifestyle', event.target.files)}
          />

          {currentLifestylePhotoUrls.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {currentLifestylePhotoUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_14px_28px_-22px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_20px_42px_-28px_rgba(0,0,0,0.58)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${name} 生活照`} className="h-28 w-full object-cover" />
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white/75 px-4 py-5 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-foreground/58">
              还没有上传生活照。后续可以补充气质照、旅行照或日常生活照。
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
