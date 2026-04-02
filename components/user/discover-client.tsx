'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProfileCard } from '@/components/client/profile-card'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { Intention, Profile } from '@/types/database'

type Candidate = Profile & {
  intentions?: Intention[] | null
  score: number
}

export function DiscoverClient() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Candidate[]>([])

  async function handleSearch() {
    setLoading(true)
    try {
      const res = await fetch('/api/user/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, city, ageMin, ageMax }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '筛选失败')
      setResults(data.candidates ?? [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-white p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI 对话筛选对象</h2>
          <p className="text-sm text-gray-500 mt-1">
            先用自然语言描述偏好，再结合条件筛选。系统会结合你的资料卡和当前条件推荐对象。
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="query">自然语言偏好</Label>
          <Textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            placeholder="例如：我想找在上海工作、本科以上、年龄 26 到 32 岁、性格温和，愿意一起定居的人。"
          />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="city">城市</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="如：上海" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ageMin">最小年龄</Label>
            <Input id="ageMin" type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ageMax">最大年龄</Label>
            <Input id="ageMax" type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSearch} disabled={loading} className="bg-rose-500 hover:bg-rose-600">
          <Sparkles className="w-4 h-4 mr-2" />
          {loading ? '筛选中...' : '开始筛选'}
        </Button>
      </div>

      {!results.length ? (
        <div className="rounded-3xl border border-dashed bg-white/70 px-6 py-16 text-center text-gray-400">
          还没有筛选结果，先输入你的偏好开始试试看。
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {results.map((candidate) => (
            <div key={candidate.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-500">推荐分</span>
                <span className="text-lg font-semibold text-rose-600">{Math.round(candidate.score)}</span>
              </div>
              <ProfileCard profile={candidate} intention={candidate.intentions?.[0] ?? null} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
