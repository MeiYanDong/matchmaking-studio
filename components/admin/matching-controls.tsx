'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { rerunMatchingForAll, updateMatchingThreshold } from '@/actions/matching'
import { LoaderCircle } from 'lucide-react'

export function MatchingControls({ currentThreshold }: { currentThreshold: number }) {
  const [threshold, setThreshold] = useState(String(currentThreshold))
  const [saving, setSaving] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  const router = useRouter()

  async function handleSaveThreshold() {
    setSaving(true)
    try {
      const numericThreshold = Number(threshold)
      if (!Number.isFinite(numericThreshold) || numericThreshold <= 0 || numericThreshold > 100) {
        throw new Error('阈值需要在 1-100 之间')
      }
      await updateMatchingThreshold(numericThreshold)
      toast.success('匹配阈值已更新')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRerunAll() {
    setRerunning(true)
    try {
      const result = await rerunMatchingForAll()
      toast.success(`已为 ${result.profiles} 位客户重跑匹配，共刷新 ${result.matched} 条记录`)
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRerunning(false)
    }
  }

  return (
    <div className="rounded-[28px] border border-[#e2d5c8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,244,236,0.92))] p-6 shadow-[0_22px_48px_-38px_rgba(35,24,21,0.28)]">
      <h2 className="mb-4 font-semibold text-[#231815]">匹配引擎控制台</h2>
      <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div className="space-y-2">
          <Label htmlFor="threshold">匹配阈值</Label>
          <Input
            id="threshold"
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>
        <Button onClick={handleSaveThreshold} disabled={saving} className="bg-[#8f3c32] hover:bg-[#7f342b]">
          {saving && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
          {saving ? '保存中...' : '保存阈值'}
        </Button>
        <Button variant="outline" onClick={handleRerunAll} disabled={rerunning}>
          {rerunning && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
          {rerunning ? '重跑中...' : '全量重跑'}
        </Button>
      </div>
    </div>
  )
}
