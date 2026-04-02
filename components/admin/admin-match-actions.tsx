'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MatchStatus } from '@/types/database'
import { LoaderCircle } from 'lucide-react'

const STATUS_OPTIONS: MatchStatus[] = [
  'pending',
  'reviewing',
  'contacted_male',
  'contacted_female',
  'both_agreed',
  'meeting_scheduled',
  'met',
  'succeeded',
  'failed',
  'dismissed',
]

interface AdminMatchActionsProps {
  matchId: string
  currentStatus: MatchStatus
  currentMatchmakerId: string
  matchmakers: { id: string; name: string }[]
}

export function AdminMatchActions({
  matchId,
  currentStatus,
  currentMatchmakerId,
  matchmakers,
}: AdminMatchActionsProps) {
  const [status, setStatus] = useState<MatchStatus>(currentStatus)
  const [matchmakerId, setMatchmakerId] = useState(currentMatchmakerId)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('matches')
        .update({
          status,
          matchmaker_id: matchmakerId,
        })
        .eq('id', matchId)

      if (error) throw error

      toast.success('匹配记录已更新')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={(value) => value && setStatus(value as MatchStatus)}>
        <SelectTrigger className="h-8 text-xs w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option} value={option} className="text-xs">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={matchmakerId} onValueChange={(value) => value && setMatchmakerId(value)}>
        <SelectTrigger className="h-8 text-xs w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {matchmakers.map((matchmaker) => (
            <SelectItem key={matchmaker.id} value={matchmaker.id} className="text-xs">
              {matchmaker.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button size="sm" className="h-8 text-xs bg-rose-500 hover:bg-rose-600" onClick={handleSave} disabled={loading}>
        {loading && <LoaderCircle className="w-3.5 h-3.5 mr-1 animate-spin" />}
        {loading ? '保存中...' : '保存'}
      </Button>
    </div>
  )
}
