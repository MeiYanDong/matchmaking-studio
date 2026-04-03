'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Mars, Venus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Gender = 'male' | 'female'

type ErrorPayload = {
  error?: string
}

type CreatePayload = {
  ok: true
  profile: {
    id: string
  }
}

export function AgentPocNewClientForm() {
  const router = useRouter()
  const [gender, setGender] = useState<Gender>('female')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const payload = {
      name: String(formData.get('name') || '').trim(),
      gender,
      phone: String(formData.get('phone') || '').trim(),
      note: String(formData.get('note') || '').trim(),
    }

    try {
      const response = await fetch('/api/agent-poc/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as CreatePayload | ErrorPayload
      if (!response.ok || !('ok' in result)) {
        const errorResult = result as ErrorPayload
        throw new Error(errorResult.error || '创建草稿客户失败')
      }

      router.push(`/agent-poc/clients/${result.profile.id}/audio-transcribe`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '创建草稿客户失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>性别</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['male', 'female'] as Gender[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setGender(value)}
              className={`rounded-2xl border-2 p-4 text-center transition-all ${
                gender === value
                  ? value === 'male'
                    ? 'border-sky-400 bg-sky-50 text-sky-700'
                    : 'border-rose-400 bg-rose-50 text-rose-700'
                  : 'border-stone-200 text-stone-500 hover:border-stone-300'
              }`}
            >
              <div className="mb-2 flex justify-center">
                {value === 'male' ? <Mars className="h-6 w-6" /> : <Venus className="h-6 w-6" />}
              </div>
              <div className="font-medium">{value === 'male' ? '男方' : '女方'}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">姓名</Label>
        <Input id="name" name="name" placeholder="先填一个可识别称呼，后续录音里还能继续补齐" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">联系方式</Label>
        <Input id="phone" name="phone" placeholder="手机号码或微信，便于本地测试区分客户" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">备注</Label>
        <Textarea id="note" name="note" rows={3} placeholder="来源渠道、初始印象，或这次录音的背景说明" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Link
          href="/agent-poc/clients"
          className={cn(buttonVariants({ variant: 'outline', className: 'flex-1' }))}
        >
          返回客户列表
        </Link>
        <Button type="submit" className="flex-1 bg-[#24150f] text-white hover:bg-[#3a2418]" disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              创建中...
            </>
          ) : (
            '创建草稿并去上传录音'
          )}
        </Button>
      </div>
    </form>
  )
}
