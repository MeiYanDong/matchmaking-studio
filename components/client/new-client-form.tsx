'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createClient } from '@/actions/clients'
import { GenderType } from '@/types/database'
import { LoaderCircle, Mars, Venus } from 'lucide-react'

export function NewClientForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [gender, setGender] = useState<GenderType>('female')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    try {
      const profile = await createClient({
        name: formData.get('name') as string,
        gender,
        phone: formData.get('phone') as string || undefined,
        note: formData.get('note') as string || undefined,
      })
      toast.success('草稿客户已创建，继续上传第一段录音即可让 AI 自动补齐字段')
      router.push(`/matchmaker/clients/${profile.id}/upload`)
    } catch (err) {
      toast.error('创建失败：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>客户身份</Label>
          <p className="text-sm leading-6 text-muted-foreground">
            先确认客户性别与归属，后续录音和匹配都会沿用这层基础身份。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['male', 'female'] as GenderType[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              aria-pressed={gender === g}
              className={`group rounded-[1.4rem] border px-4 py-4 text-left transition-all ${
                gender === g
                  ? g === 'male'
                    ? 'border-blue-400/50 bg-[linear-gradient(180deg,rgba(85,145,255,0.12),rgba(255,255,255,0.86))] text-blue-700 shadow-[0_18px_38px_-30px_rgba(67,111,198,0.65)] dark:border-blue-300/20 dark:bg-[linear-gradient(180deg,rgba(87,135,255,0.18),rgba(255,255,255,0.03))] dark:text-blue-100'
                    : 'border-pink-400/50 bg-[linear-gradient(180deg,rgba(255,120,199,0.14),rgba(255,255,255,0.88))] text-pink-700 shadow-[0_18px_38px_-30px_rgba(210,94,157,0.65)] dark:border-pink-300/20 dark:bg-[linear-gradient(180deg,rgba(255,104,182,0.16),rgba(255,255,255,0.03))] dark:text-pink-100'
                  : 'border-border/80 surface-soft text-foreground/74 hover:border-border hover:bg-[color:var(--surface-soft-strong)]'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    gender === g
                      ? g === 'male'
                        ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-400/14 dark:text-blue-100'
                        : 'bg-pink-500/10 text-pink-700 dark:bg-pink-400/14 dark:text-pink-100'
                      : 'surface-contrast text-foreground/56'
                  }`}
                >
                  {g === 'male' ? (
                    <Mars className="h-5 w-5" />
                  ) : (
                    <Venus className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {g === 'male' ? 'Male' : 'Female'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="font-medium">{g === 'male' ? '男方客户' : '女方客户'}</div>
                <div className="text-sm text-muted-foreground">
                  {g === 'male' ? '先建立男方档案，后续录音补齐资料' : '先建立女方档案，后续录音补齐资料'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">姓名</Label>
          <Input id="name" name="name" placeholder="可先不填完整姓名，后续录音里再补齐" />
          <p className="text-xs leading-5 text-muted-foreground">
            如果当前只知道昵称或姓氏，也可以先填，后续会继续完善。
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">联系方式（红娘内部使用）</Label>
          <Input id="phone" name="phone" placeholder="手机号码 / 微信 / 线索联系方式" type="tel" />
          <p className="text-xs leading-5 text-muted-foreground">
            只作为红娘内部识别与回访使用，不会直接影响录音建档流程。
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">备注</Label>
        <Textarea id="note" name="note" placeholder="内部备注、来源渠道、初始印象或已知线索" rows={4} />
        <p className="text-xs leading-5 text-muted-foreground">
          比如“朋友介绍”“家里催得急”“已加微信”等，方便后续跟进时快速回忆上下文。
        </p>
      </div>

      <div className="flex gap-3 border-t border-border/70 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
          取消
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? '创建中...' : '创建草稿并去上传录音'}
        </Button>
      </div>
    </form>
  )
}
