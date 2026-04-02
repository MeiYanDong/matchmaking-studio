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
import { LoaderCircle } from 'lucide-react'

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
      {/* 性别选择 */}
      <div className="space-y-2">
        <Label>性别</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['male', 'female'] as GenderType[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                gender === g
                  ? g === 'male'
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-pink-400 bg-pink-50 text-pink-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{g === 'male' ? '👨' : '👩'}</div>
              <div className="font-medium">{g === 'male' ? '男方' : '女方'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 姓名 */}
      <div className="space-y-2">
        <Label htmlFor="name">姓名</Label>
        <Input id="name" name="name" placeholder="可先不填，AI 后续会从首段录音里补齐" />
      </div>

      {/* 联系方式 */}
      <div className="space-y-2">
        <Label htmlFor="phone">联系方式（红娘内部使用）</Label>
        <Input id="phone" name="phone" placeholder="手机号码" type="tel" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">备注</Label>
        <Textarea id="note" name="note" placeholder="内部备注、初始印象或来源渠道" rows={3} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
          取消
        </Button>
        <Button type="submit" className="flex-1 bg-rose-500 hover:bg-rose-600" disabled={loading}>
          {loading && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
          {loading ? '创建中...' : '创建草稿并去上传录音'}
        </Button>
      </div>
    </form>
  )
}
